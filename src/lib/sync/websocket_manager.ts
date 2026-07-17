import { moment, Platform, normalizePath } from "obsidian";
import { ConflictResolveModal } from "../../views/conflict-resolve-modal";

import { handleFileChunkDownload, BINARY_PREFIX_FILE_SYNC, clearUploadQueue, receiveFileUploadSessionNotFound } from "./operator_file";
import { dump, addRandomParam, showSyncNotice, safeStringify, getPluginDir, hashContent } from "../utils/helpers";
import { enSendDTOToProtobuf, deReceivePacket } from "../../pb/protobuf_mapper";
import { receiveOperators, startupSync, startupFullSync, settleAllBatchSendSessionsOnClose } from "./operator";
import { SyncLogManager } from "./sync_log_manager";
import * as WSAction from "./websocket_action";
import { WebSocketClient } from "./websocket_client";
import { CLIENT_TYPE } from "../utils/types";
import type FastSync from "../../main";
import { $ } from "../../i18n/lang";


// 冲突相关错误码
const ERROR_SYNC_CONFLICT = 530;

const AUTH_ERROR_REIMPORT_CODES = new Set([307, 308, 309, 310]);

const AUTH_ERROR_FALLBACK_MESSAGES: Record<number, string> = {
  307: "Authorization token is missing",
  308: "Session expired or token has been revoked",
  309: "Authorization token is invalid or incomplete",
  310: "Authorization token has expired",
  312: "Authorization token is restricted by IP",
  313: "Authorization token is restricted by user agent",
  314: "Authorization token is restricted by client",
  315: "Authorization token scope is restricted",
};

export interface StructuredMessageData {
  code: number;
  status?: boolean;
  message?: string;
  details?: string;
  data?: Record<string, unknown> | null;
  vault?: string;
  context?: string; // 当前同步上下文 / Current sync context
  // WSResponse 信封 pageIndex，线上值 1-based：0/undefined=非分页消息，n>0=下载第 n-1 页（设计稿 §4.3，
  // 用户澄清覆盖设计稿 §2.4 的旧假设）。JSON 模式下该字段随服务端顶层 JSON 天然携带；pb 模式由
  // protobuf_mapper.ts 的 deReceivePacket 透传。1-based->0-based 转换统一在 handleStructuredMessage 做。
  // WSResponse envelope pageIndex, wire value is 1-based: 0/undefined=non-paginated message,
  // n>0=download page n-1 (design §4.3; this supersedes design §2.4's original assumption per
  // user clarification). JSON mode carries it naturally as a top-level key; pb mode passes it
  // through via protobuf_mapper.ts's deReceivePacket. The 1-based->0-based conversion happens in
  // exactly one place: handleStructuredMessage below.
  pageIndex?: number;
}

function normalizeNoticeValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map(item => normalizeNoticeValue(item))
      .filter(Boolean)
      .join(", ");
  }

  const text = safeStringify(value).trim();
  return text === "undefined" ? "" : text;
}

export function formatAuthorizationError(data: StructuredMessageData): string {
  const message = normalizeNoticeValue(data.message) || AUTH_ERROR_FALLBACK_MESSAGES[data.code] || "Authorization failed";
  const details = normalizeNoticeValue(data.details);
  const detailsText = details ? " Details=" + details : "";
  const authFailureText = (message + " " + details).toLowerCase();
  const needsReimportHint = AUTH_ERROR_REIMPORT_CODES.has(data.code) ||
    authFailureText.includes("rotated") ||
    authFailureText.includes("revoked") ||
    authFailureText.includes("no longer exists") ||
    authFailureText.includes("missing");
  const hint = needsReimportHint ? " Hint=Please re-import the API configuration from the management console." : "";

  return "Service Authorization Error: Code=" + data.code + " Msg=" + message + detailsText + hint;
}

export class WebSocketManager {
  public client: WebSocketClient;
  private plugin: FastSync;
  private currentStartHandleId = 0;
  // startupDelay 按设置文案（setting.sync.startup_delay_desc）本意是只延迟"首次"检查更新，
  // 用于错开 Obsidian 启动时其他插件并发加载造成的卡顿；不应在每次断线重连时都重复套用。
  // startupDelay is documented as delaying only the "first" update check, to avoid contending
  // with other plugins loading at Obsidian startup — it should not be re-applied on every reconnect.
  private hasAppliedStartupDelay = false;

  // --- 轻量事件总线，用于分批发送时等待服务端 BatchAck ---
  // Lightweight event bus for awaiting server BatchAck during batch send
  private _listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  /**
   * 订阅事件 / Subscribe to an event
   */
  public on(event: string, cb: (...args: unknown[]) => void): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(cb);
  }

  /**
   * 取消订阅事件 / Unsubscribe from an event
   */
  public off(event: string, cb: (...args: unknown[]) => void): void {
    const cbs = this._listeners.get(event);
    if (cbs) {
      cbs.delete(cb);
      if (cbs.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  /**
   * 触发事件 / Emit an event
   */
  public emit(event: string, ...args: unknown[]): void {
    const cbs = this._listeners.get(event);
    if (cbs) {
      cbs.forEach(cb => cb(...args));
    }
  }

  constructor(plugin: FastSync) {
    this.plugin = plugin;
    this.client = new WebSocketClient(this.plugin, {
      getWsUrl: (count) => {
        const client = CLIENT_TYPE;
        const clientName = encodeURIComponent(this.plugin.getClientName());
        const clientVersion = this.plugin.manifest.version || "";
        // Always include protocol=protobuf regardless of settings
        // 无论设置如何，始终包含 protocol=protobuf 参数
        const useProtoParam = "&protocol=protobuf";
        // pv=2：声明客户端支持 v2 握手协商（auth 响应携带协商块、窗口流水线、pb 提前升级）
        // pb=1/0：客户端本地 protobufEnabled 设置，供服务端判定是否提前升级 pb（设计稿 §2.2）
        const isProtobufEnabled = this.plugin.settings.protobufEnabled !== false;
        const negotiationParams = "&pv=2&pb=" + (isProtobufEnabled ? "1" : "0");
        return addRandomParam(
          this.plugin.runWsApi +
          "/api/user/sync?lang=" +
          moment.locale() +
          "&count=" +
          count +
          "&client=" +
          client +
          "&clientName=" +
          clientName +
          "&clientVersion=" +
          clientVersion +
          useProtoParam +
          negotiationParams
        );
      },
      preConnectProbe: async () => {
        const needProbe = this.plugin.settings.autoRedirectEnabled || this.plugin.settings.wsPreProbeEnabled;
        if (needProbe) {
          return await this.plugin.api.probeApiRedirect(this.plugin.runApi);
        }
        return true;
      },
      onOpen: (client) => {
        client.Send(WSAction.ClientReceiveAuth, this.plugin.settings.apiToken);
        dump("Service authorization");
      },
      onClose: (client, code, reason) => {
        if (this.plugin.isSyncing) {
          this.plugin.isSyncing = false;
          this.plugin.isSyncRequesting = false;
        }
        clearUploadQueue();
        this.plugin.concurrencyLimiter.clear();
        // 断线：清空所有在途上行批发送窗口会话的重传 timer（设计稿 §3.2 异常路径表）；
        // W==0/旧路径下没有会话注册，no-op
        settleAllBatchSendSessionsOnClose();
      },
      onMessage: (client, action, data) => {
        this.handleStructuredMessage(action, data);
      },
      serializeMessage: (action, payload) => {
        return enSendDTOToProtobuf(action, payload);
      },
      deserializeMessage: (data) => {
        return deReceivePacket(data) as unknown as { action: string;[key: string]: unknown };
      },
    });

    // 绑定大流量下载 binary handler
    this.client.registerBinaryHandler(BINARY_PREFIX_FILE_SYNC, (data) => {
      void handleFileChunkDownload(data, this.plugin);
    });
  }

  // 代理一些 WebSocketClient 的方法和属性以保持向后兼容性
  public get ws(): WebSocket | null {
    return this.client.ws;
  }
  public get isOpen(): boolean {
    return this.client.isOpen;
  }
  public get isAuth(): boolean {
    return this.client.isAuth;
  }
  public set isAuth(val: boolean) {
    this.client.isAuth = val;
  }
  public get useProtobuf(): boolean {
    return this.client.useProtobuf;
  }
  public get isRegister(): boolean {
    return this.client.isRegister;
  }
  public set isRegister(val: boolean) {
    this.client.isRegister = val;
  }
  public get count(): number {
    return this.client.count;
  }

  public addStatusListener(listener: (status: boolean) => void) {
    this.client.addStatusListener(listener);
  }
  public removeStatusListener(listener: (status: boolean) => void) {
    this.client.removeStatusListener(listener);
  }
  public addActivityListener(listener: () => void) {
    this.client.addActivityListener(listener);
  }
  public register() {
    return this.client.register();
  }
  public unRegister(setUnregistered = false) {
    this.client.unRegister(setUnregistered);
  }
  public isConnected(): boolean {
    return this.client.isConnected();
  }
  public triggerReconnect() {
    this.client.triggerReconnect();
  }
  public SendMessage(action: WSAction.WSSendAction, data: unknown, before?: () => boolean, after?: () => void, context?: string) {
    const injectedData = this.injectContext(data, context);
    return this.client.SendMessage(action, injectedData, before, () => {
      // Record the send event in sync logs
      // 在同步日志中记录发送事件
      SyncLogManager.getInstance().logSentMessage(action, injectedData as object | string, this.plugin.currentSyncType);
      after?.();
    });
  }
  public Send(action: WSAction.WSSendAction, data: unknown, after?: () => void, context?: string) {
    const injectedData = this.injectContext(data, context);
    this.client.Send(action, injectedData, () => {
      // Record the send event in sync logs
      // 在同步日志中记录发送事件
      SyncLogManager.getInstance().logSentMessage(action, injectedData as object | string, this.plugin.currentSyncType);
      after?.();
    });
  }

  /**
   * Injects the current sync context into outgoing payload if in an active sync session.
   * 如果处于活跃同步状态，向消息载荷注入当前同步 context。
   * 仅对不已携带 context 字段的对象类型载荷进行注入，避免重复注入。
   */
  private injectContext(data: unknown, context?: string): unknown {
    const ctx = context || this.plugin.syncState.activeSyncContext;
    if (
      ctx &&
      data !== null &&
      typeof data === 'object' &&
      !('context' in (data as Record<string, unknown>))
    ) {
      return { ...(data as Record<string, unknown>), context: ctx };
    }
    return data;
  }
  public SendBinary(data: ArrayBuffer | Uint8Array, prefix: string, before?: () => boolean, after?: () => void) {
    return this.client.SendBinary(data, prefix, before, after);
  }

  private isStructuredMessageData(obj: unknown): obj is StructuredMessageData {
    if (typeof obj !== "object" || obj === null) {
      return false;
    }
    const record = obj as Record<string, unknown>;
    return typeof record.code === "number";
  }

  private handleStructuredMessage(msgAction: string, data: unknown) {
    if (!this.isStructuredMessageData(data)) {
      return;
    }

    // 记录接收到的消息
    if (msgAction) {
      SyncLogManager.getInstance().logReceivedMessage(msgAction, data, this.plugin.currentSyncType);
    }

    if (msgAction === WSAction.ClientReceiveAuth) {
      if (data.code <= 0 || data.code >= 300) {
        showSyncNotice(formatAuthorizationError(data), 6000);
        return;
      } else {
        this.client.isAuth = true;
        const paths = (data.data?.["paths"] as string[]) || [];
        this.plugin.shareIndicatorManager?.updateSharedPaths(paths);
        if (data.data) {
          const serverVersion = (data.data["version"] as string) ?? this.plugin.localStorageManager.getMetadata("serverVersion");
          const serverChangelog = (data.data["changelog"] as string) ?? this.plugin.localStorageManager.getMetadata("serverChangelog");
          this.plugin.localStorageManager.setMetadata("serverVersion", serverVersion);
          this.plugin.localStorageManager.setMetadata("serverChangelog", serverChangelog);
        }

        // 握手合并（设计稿 §5.2）：pv>=2 的服务端在 auth 响应追加协商块，此处必须在 StartHandle() 之前
        // 写入 syncState，因为 sendSyncInBatches 的窗口大小/chunkNum 默认取 syncState 当前值。
        // 旧服务端（无协商块）：所有协商字段保持 sync_state.ts 的默认值（negotiated=false, window=0），
        // 即现状 stop-and-wait，行为零变化。
        // Handshake merge (design §5.2): a pv>=2 server appends a negotiation block to the auth
        // response. This MUST be written to syncState before StartHandle() is invoked below, since
        // sendSyncInBatches reads window size/chunkNum defaults from syncState at call time.
        // Old server (no negotiation block): all fields stay at sync_state.ts defaults
        // (negotiated=false, window=0) — current stop-and-wait behavior, unchanged.
        if (data.data) {
          const nego = data.data;
          let negotiated = false;
          if (typeof nego.syncUpChunkNum === "number") {
            this.plugin.syncState.syncUpChunkNum = nego.syncUpChunkNum;
            negotiated = true;
          }
          if (typeof nego.syncDownChunkNum === "number") {
            this.plugin.syncState.syncDownChunkNum = nego.syncDownChunkNum;
            negotiated = true;
          }
          if (typeof nego.pipelineWindowUp === "number") {
            this.plugin.syncState.pipelineWindowUp = nego.pipelineWindowUp;
            negotiated = true;
          }
          if (typeof nego.pipelineWindowDown === "number") {
            this.plugin.syncState.pipelineWindowDown = nego.pipelineWindowDown;
            negotiated = true;
          }
          this.plugin.syncState.negotiated = negotiated;
          // protobufAck===true：服务端已在 auth 响应后提前 setUseProtobuf，本连接后续下行帧即为 pb，
          // 客户端同步跟进，无需再等 ClientInfo 响应触发升级（websocket_client.ts:259 该触发仍保留作旧服务端路径）
          if (nego.protobufAck === true && this.plugin.settings.protobufEnabled !== false) {
            this.client.useProtobuf = true;
            dump("WS Client upgraded to Protobuf via auth negotiation (pv2)");
          }
        }

        dump("Service authorization success");
        this.client.notifyStatusChange(true);

        this.sendClientInfo();
        void this.StartHandle();
      }
      return;
    }

    if (msgAction === WSAction.ClientReceiveInfo) {
      if (data.code <= 0 || data.code >= 300) {
        return;
      } else {
        if (data.data) {
          this.plugin.versionManager.updateFromClientInfo(data.data);
        }
      }
      return;
    }

    if (data.code <= 0 || data.code >= 300) {
      // 处理冲突相关错误码
      if (data.code === ERROR_SYNC_CONFLICT) {
        void this.handleConflictError(data);
        const path = data.data?.path || data.data?.Path || (data.data as any)?.Path;
        if (typeof path === "string") {
          this.plugin.concurrencyLimiter.releaseSlot(path);
          const pageIndex = this.plugin.syncState.pendingNotePushPageIndex.get(path);
          this.plugin.syncState.pendingNotePushPageIndex.delete(path);
          this.plugin.recordSyncCompleted('note', pageIndex);
        }
      } else if (data.code === 463 && typeof data.data?.sessionID === "string") {
        receiveFileUploadSessionNotFound(data.data.sessionID, this.plugin);
      } else {
        const errorMsg = data.message || "";
        const errorDetails = data.details ? " Details=" + data.details : "";
        showSyncNotice("Service Error: Code=" + data.code + " Message=" + errorMsg + errorDetails);
        
        // 如果错误数据里含有 sessionID 或 path，也进行释放和清理，防止同步卡死
        // If error payload contains sessionID or path, release slot and increment completed to prevent deadlock
        if (data.data && typeof data.data.sessionID === "string") {
          receiveFileUploadSessionNotFound(data.data.sessionID, this.plugin);
        } else if (data.data && typeof data.data.path === "string") {
          const path = data.data.path;
          this.plugin.concurrencyLimiter.releaseSlot(path);
          this.plugin.fileSyncTasks.completed++;
        }
      }
    } else {
      if (typeof data === "object" && "vault" in data && data.vault != null && data.vault !== "" && data.vault !== this.plugin.settings.vault) {
        dump("Service vault " + data.vault + " not match " + this.plugin.settings.vault);
        return;
      }

      // 基于 Context 进行过滤：如果处于活跃的同步中，必须完全匹配
      // Filter based on Context: if there's an active sync context, incoming messages (including Acks) must match
      if (this.plugin.syncState.activeSyncContext) {
        const isControlMsg = msgAction === WSAction.ClientReceiveAuth || msgAction === WSAction.ClientReceiveInfo;
        if (!isControlMsg && data.context !== this.plugin.syncState.activeSyncContext) {
          dump(`[SyncContext] Discard message ${msgAction} due to mismatched context. Expected: ${this.plugin.syncState.activeSyncContext}, Got: ${data.context}`);
          return;
        }
      }

      const handler = receiveOperators.get(msgAction);
      if (handler) {
        // WSResponse 信封 pageIndex 转换（设计稿 §4.3，唯一转换点）：线上 1-based，
        // 0/undefined = 非分页消息（不并入 payload，下游按 undefined 走旧路径）；
        // n>0 = 下载第 n-1 页，转换为内部 0-based 值并入 payload.pageIndex
        // WSResponse envelope pageIndex conversion (design §4.3, the single conversion point):
        // wire value is 1-based. 0/undefined = non-paginated (not merged into payload, downstream
        // reads undefined and takes the legacy path); n>0 = download page n-1, converted to the
        // internal 0-based value and merged into payload.pageIndex
        const rawPageIndex = typeof data.pageIndex === 'number' ? data.pageIndex : 0;
        const pageIndex = rawPageIndex > 0 ? rawPageIndex - 1 : undefined;

        let payload: unknown = data.data;
        if (typeof data.data === 'object' && data.data !== null) {
          const merged = { ...data.data };
          if (data.context) merged.context = data.context;
          if (pageIndex !== undefined) merged.pageIndex = pageIndex;
          payload = merged;
        }
        void handler(payload, this.plugin);
        this.client.notifyActivity();
      }
    }
  }

  public sendClientInfo() {
    if (!this.client.isAuth) {
      return;
    }

    const clientName = this.plugin.getClientName();
    const isProtobufEnabled = this.plugin.settings.protobufEnabled !== false;

    if (!isProtobufEnabled) {
      // Reset client's Protobuf flag immediately to fallback to JSON format
      // 立即将客户端的 Protobuf 标志重置为 false 以退回到 JSON 格式
      this.client.useProtobuf = false;
    }

    this.Send(WSAction.ClientReceiveInfo, {
      name: clientName,
      version: this.plugin.manifest.version,
      type: CLIENT_TYPE,
      isDesktop: Platform.isDesktop,
      isMobile: Platform.isMobile,
      isPhone: Platform.isPhone,
      isTablet: Platform.isTablet,
      isMacOS: Platform.isMacOS,
      isWin: Platform.isWin,
      isLinux: Platform.isLinux,
      offlineSyncStrategy: this.plugin.settings.offlineSyncStrategy,
      protobuf: isProtobufEnabled,
    });
  }

  public async StartHandle() {
    const handleId = ++this.currentStartHandleId;
    dump(`Service start handle, id: ${handleId}`);

    // 验收断言（设计稿 §5.2 第 2 点）：协商写入必须先于 StartHandle 调用完成——
    // 要么本连接已完成 pv2 协商（negotiated=true），要么服务端是不支持协商的 v1（协商字段维持默认值，
    // 后续走 stop-and-wait）。这里只做非阻断式告警，禁止把 handleStructuredMessage 里的协商写入移到
    // StartHandle() 调用之后。
    // Acceptance assertion (design §5.2 point 2): negotiation write-back must complete before
    // StartHandle is invoked — either this connection completed pv2 negotiation, or the server is a
    // pre-negotiation v1 (fields stay at defaults, falls back to stop-and-wait). Non-blocking warn
    // only; do not move the negotiation write in handleStructuredMessage to after this call.
    if (!this.plugin.syncState.negotiated) {
      dump(`[Negotiation] StartHandle entered without pv2 negotiation — treating server as v1 (stop-and-wait fallback)`);
    }

    if (this.plugin.settings.startupDelay > 0 && !this.hasAppliedStartupDelay) {
      this.hasAppliedStartupDelay = true;
      dump(`Startup delay: ${this.plugin.settings.startupDelay}ms`);
      await new Promise((resolve) => window.setTimeout(resolve, this.plugin.settings.startupDelay));
    }

    if (handleId !== this.currentStartHandleId) {
      dump(`Service start handle cancelled, id: ${handleId}`);
      return;
    }

    // 等待 fileHashManager 初始化完成
    if (!this.plugin.fileHashManager || !this.plugin.fileHashManager.isReady()) {
      dump(`Waiting for fileHashManager to be ready...`);

      // 最多等待 30 秒
      const maxWaitTime = 30000;
      const startTime = Date.now();

      while (!this.plugin.fileHashManager || !this.plugin.fileHashManager.isReady()) {
        if (Date.now() - startTime > maxWaitTime) {
          dump(`FileHashManager initialization timeout after ${maxWaitTime}ms`);
          showSyncNotice("文件哈希管理器初始化超时,同步可能不稳定");
          break;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }

      if (this.plugin.fileHashManager && this.plugin.fileHashManager.isReady()) {
        dump("FileHashManager is ready, proceeding with sync");
      }
    }

    this.plugin.isFirstSync = true;

    // 检查是否有用户手动触发的待执行同步 / Check if user manually triggered a pending sync
    const pendingType = this.plugin.syncState.pendingSyncType;
    this.plugin.syncState.pendingSyncType = null;

    if (this.plugin.settings.manualSyncEnabled) {
      // 如果用户手动触发了同步，即使 manualSyncEnabled 也执行一次
      // If user manually triggered sync, execute once even with manualSyncEnabled
      if (pendingType) {
        if (pendingType === 'full') {
          void startupFullSync(this.plugin);
        } else {
          void startupSync(this.plugin);
        }
      } else {
        dump("Full Manual Sync Mode enabled, skipping startup sync");
      }
      return;
    }

    // 有 pending 同步请求时，使用 pending 的类型；否则走默认增量同步
    // If pending sync requested, use its type; otherwise default incremental
    if (pendingType === 'full') {
      void startupFullSync(this.plugin);
    } else {
      void startupSync(this.plugin);
    }
  }

  private async handleConflictError(data: StructuredMessageData) {
    const path = data.data?.path || data.data?.Path || (data.data as any)?.Path;
    const serverContent = (data.data as any)?.serverContent || (data.data as any)?.ServerContent;
    const baseContent = (data.data as any)?.baseContent || (data.data as any)?.BaseContent;
    const rawHash = (data.data as any)?.serverHash ?? (data.data as any)?.ServerHash;
    const serverHash = rawHash != null ? String(rawHash) : "";

    dump("[ConflictDebug] handleConflictError triggered. Path:", path, 
         "serverContent length:", serverContent ? serverContent.length : "undefined/null",
         "serverHash:", serverHash, 
         "strategy:", this.plugin.settings.offlineSyncStrategy);

    if (this.plugin.settings.offlineSyncStrategy === "manualMerge" &&
        typeof path === "string" && typeof serverContent === "string" && serverHash !== "") {
      
      const conflictData = {
        serverContent,
        baseContent: baseContent || "",
        serverHash,
        message: $("ui.log.error_code.530") || "检测到同步冲突，需要手动处理"
      };
      
      SyncLogManager.getInstance().addLog(
        'error',
        'NoteManualMergeConflict',
        JSON.stringify(conflictData),
        'error',
        path,
        this.plugin.settings.vault
      );

      // 写入 Base 和 Remote 物理冲突文件到 conflict-notes (位于插件目录下，文件名附加路径哈希以防碰撞)
      try {
        const adapter = this.plugin.app.vault.adapter;
        const conflictDir = `${getPluginDir(this.plugin)}/conflict-notes`;
        if (!(await adapter.exists(conflictDir))) {
          await adapter.mkdir(conflictDir);
        }

        const safeName = path.replace(/\.md$/, "").replace(/[\/\\]/g, "_");
        const pathHash = hashContent(path);
        const baseBackupPath = `${conflictDir}/${safeName}_${pathHash}.base.md`;
        const remoteBackupPath = `${conflictDir}/${safeName}_${pathHash}.remote.md`;

        await adapter.write(baseBackupPath, baseContent || "");
        await adapter.write(remoteBackupPath, serverContent);
      } catch (e) {
        dump("Failed to create conflict-notes backup files:", e);
      }

      this.plugin.syncState.conflictedPaths.add(path);
      this.plugin.syncState.newConflictedPathsThisRound.add(path);
      this.plugin.localStorageManager.setConflictedPaths(this.plugin.syncState.conflictedPaths);
      this.plugin.statusBarManager.updateConflictBadge();
    } else {
      if (typeof path === "string") {
        dump("Conflict detected:", { code: data.code, Path: path, message: data.message });
        showSyncNotice($("ui.status.conflict", { path: path }), 10000);
      }
    }
  }
}
