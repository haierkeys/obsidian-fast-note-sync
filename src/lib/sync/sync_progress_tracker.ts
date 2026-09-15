// src/lib/sync/sync_progress_tracker.ts
import { dump } from "../utils/helpers";
import { $ } from "../../i18n/lang";

export type SyncType = 'note' | 'file' | 'setting' | 'folder';
export type SyncPhase = 'hash' | 'upload' | 'download' | 'idle';

/**
 * Tracks progress state for a single sync type.
 * 追踪单个同步类型的进度状态。
 */
interface TypeProgress {
  // Upload status / 上传状态
  uploadComplete: boolean;     // Has the SyncEnd message been received from the server / 是否已收到服务端的 SyncEnd 消息
  
  // Overall page-driven tasks progress
  pageTaskTotal: number;       // Accumulated total items from all SyncPages / 从所有分页消息中累加的总项数
  pageTaskCompleted: number;   // Processed items (completed, error, skipped) / 已处理的项数
  allPagesReceived: boolean;   // Has the last SyncPage (isLast: true) been received / 是否已收到最后一页

  // New field: precise received total from server for completion check / 实际收到的精准任务总数，仅用于完成判定，防卡死
  receivedTaskTotal: number;

  // Current page download status (used specifically for triggering page ACKs)
  downloadPageIndex: number;  // Current page index / 当前页码
  downloadPageCount: number;  // Expected items in current page / 当前页包含的项数
  downloadPageDone: number;   // Processed items in current page / 当前页已处理项数

  uploadTasksBase: number;    // 上传阶段完成任务的基准数（避免影响 isTypeFullyDone 计算）
  expectedPages: number;      // 预期分页总数
  initialAckSent: boolean;    // Has the initial ACK (pageIndex = -1) been sent / 是否已发送初始 ACK

  // 已处理过的分页索引集合，用于 recordPageProgress 按 pageIndex 去重，防止重复/乱序页重复计数
  receivedPageIndexes: Set<number>;

  // --- 多页在途归属（设计稿 §4.3，C3 新增）---
  // 按 pageIndex 归账的页级完成状态，供服务端下行窗口 W_down>0 时多页并发在途使用。
  // 新服务端（明细信封带 pageIndex）走这里；旧服务端（明细无 pageIndex）继续走上面的单页字段，
  // 该 Map 仍会被 recordPageProgress 登记（登记本身与协议版本无关，Page 元数据字段一直都有 pageIndex），
  // 只是旧服务端下不会有 recordCompleted(type, pageIndex) 调用来推进它，纯粹闲置不影响正确性。
  // Per-page completion buckets keyed by pageIndex (design §4.3, C3). Used when the server's
  // download window W_down>0 allows multiple pages in flight concurrently. New servers (detail
  // envelope carries pageIndex) drive this map via recordCompleted(type, pageIndex); old servers
  // (no envelope pageIndex) keep using the single-page fields above — this map still gets
  // registered (Page metadata always had its own pageIndex field, independent of protocol version)
  // but simply sits unused, which is harmless.
  pages: Map<number, { totalCount: number; completedCount: number; acked: boolean; isLast: boolean }>;
  // 下一个待判定 ack 的页索引（水位线）：watermark 及其之前的页全部 completedCount>=totalCount 时才可能推进
  // Next page index awaiting ack determination (watermark); can only advance past pages that are
  // already fully completed (completedCount>=totalCount)
  ackWatermark: number;
}

/**
 * Progress tracker for both upload and download sync phases.
 * 集中管理哈希计算、客户端上传和服务端推送进度的追踪器。
 */
export class SyncProgressTracker {
  private activeTypes: Set<SyncType> = new Set();
  private progressMap: Map<SyncType, TypeProgress> = new Map();
  private lastReportedPct = 0; // Prevent progress bar from going backwards / 防退保护，确保百分比不回退
  
  // Hash progress (0 to 1) / 哈希计算进度 (0-1)
  private hashProgress = 0;

  // Track if synchronization has been officially completed / 标记同步是否已正式完成
  private isForcedComplete = false;

  // --- 多页在途：15s 无明细停滞重发最高已确认页 ack 的轻量 timer（设计稿 §4.5）---
  // 挂在 progressTracker 上而非按页单独起 timer，同步结束/取消（reset/forceComplete）时统一清理
  // Lightweight per-type timer: if 15s pass with no new detail arriving, resend the ack for the
  // highest already-confirmed page (design §4.5). Lives on the tracker so reset()/forceComplete()
  // can uniformly clear it on sync end/cancel.
  private stagnationTimers: Map<SyncType, number> = new Map();
  private lastAckedPage: Map<SyncType, number> = new Map();

  // notify() 节流：整数百分比/阶段未变化时最多每 NOTIFY_THROTTLE_MS 触发一次，
  // 变化时（含阶段切换）立即触发，避免每完成一个文件就刷一次状态栏 + workspace 事件
  private readonly NOTIFY_THROTTLE_MS = 80;
  private notifyTimer: number | null = null;
  private notifyPending = false;
  private lastNotifyTime = 0;
  private lastNotifiedPct = -1;
  private lastNotifiedPhase: SyncPhase | null = null;

  /**
   * Page completion callback, triggers sendSyncPageAck.
   * 页完成回调，用于触发 sendSyncPageAck，使协议与 UI 渲染解耦。
   */
  onPageComplete?: (type: SyncType, pageIndex: number) => void;

  /**
   * Progress change callback, triggers status bar render.
   * 进度变更回调，用于触发状态栏渲染。
   */
  onChange?: (pct: number, detail: string, phase: SyncPhase) => void;

  /**
   * Secondary progress callback, used by SyncLogView for mobile display.
   * 独立的进度变更回调，供同步日志视图（移动端）订阅，与状态栏回调互相独立。
   */
  onProgressChange?: (pct: number, detail: string, phase: SyncPhase) => void;

  getActiveTypes(): SyncType[] {
    return Array.from(this.activeTypes);
  }

  getTypeTaskTotal(type: SyncType): number {
    return this.progressMap.get(type)?.pageTaskTotal || 0;
  }

  isInitialAckSent(type: SyncType): boolean {
    return this.progressMap.get(type)?.initialAckSent || false;
  }

  setInitialAckSent(type: SyncType, sent: boolean): void {
    const prog = this.progressMap.get(type);
    if (prog) {
      prog.initialAckSent = sent;
    }
  }

  /**
   * Reset the tracker for a new sync session.
   * 重置追踪器以开始新的同步会话。
   */
  reset(activeTypes: SyncType[]): void {
    this.activeTypes = new Set(activeTypes);
    this.progressMap.clear();
    this.lastReportedPct = 0;
    this.hashProgress = 0;
    this.isForcedComplete = false;

    // 新一轮同步开始，清空上一轮遗留的停滞重发 timer（设计稿 §4.5：同步结束/取消时清理）
    // New sync round starting; clear any stagnation-resend timers left from the previous round
    for (const timer of this.stagnationTimers.values()) {
      window.clearTimeout(timer);
    }
    this.stagnationTimers.clear();
    this.lastAckedPage.clear();

    for (const type of activeTypes) {
      this.progressMap.set(type, {
        uploadComplete: false,
        pageTaskTotal: 0,
        pageTaskCompleted: 0,
        allPagesReceived: false,
        receivedTaskTotal: 0,
        downloadPageIndex: -1,
        downloadPageCount: 0,
        downloadPageDone: 0,
        uploadTasksBase: 0,
        expectedPages: 0,
        initialAckSent: false,
        receivedPageIndexes: new Set<number>(),
        pages: new Map(),
        ackWatermark: 0
      });
    }

    this.notify();
  }

  /**
   * Record hash calculation progress.
   * 记录哈希计算进度 (0 to 100).
   */
  recordHashProgress(progress: number): void {
    this.hashProgress = Math.min(100, Math.max(0, progress)) / 100;
    this.notify();
  }

  /**
   * Record that upload (receiving SyncEnd from server) is complete for a sync type.
   * 记录某个同步类型的上传已完成 (收到服务端返回 of SyncEnd 消息)。
   */
  recordUploadComplete(type: SyncType, completedUploadsBase = 0): void {
    const prog = this.progressMap.get(type);
    if (!prog) return;

    prog.uploadComplete = true;
    prog.uploadTasksBase = completedUploadsBase;
    // If no pages were received, then we have all pages (0 total tasks)
    if (prog.pageTaskTotal === 0) {
      prog.allPagesReceived = true;
    }
    this.notify();
  }

  /**
   * Record that one stage-3 download/process task is truly done.
   * 记录一个阶段三任务真正完成（文件写盘/删除/跳过均算）。
   * Called independently from recordCompleted; does not trigger page ACK.
   * 与 recordCompleted 互相独立，不触发翻页 Ack，仅做进度显示计数。
   */
  recordDownloadComplete(type: SyncType): void {
    const prog = this.progressMap.get(type);
    if (!prog) return;
    prog.pageTaskCompleted++;
    this.notify();
  }

  /**
   * Record completion of one download/modify item.
   * 记录完成单个下载或处理项。
   *
   * 新旧路径选路点（设计稿 §4.3/§8 风险表）：pageIndex 由调用方从明细 payload 透传而来。
   * - pageIndex === undefined：旧服务端（明细无 pageIndex）或非分页项 → 走下面保留不变的单页全局计数
   *   分支（downloadPageIndex/downloadPageCount/downloadPageDone + onPageComplete 单值触发）。
   * - pageIndex 为数字：新服务端多页在途 → 走 pages Map 按页归账 + ack 水位线推进。
   *
   * Route selection point (design §4.3/§8 risk table): pageIndex is passed through by the caller
   * from the detail payload.
   * - pageIndex === undefined: old server (detail has no pageIndex) or a non-paginated item ->
   *   falls through to the preserved single-page global counting branch below (unchanged).
   * - pageIndex is a number: new server, multiple pages may be in flight -> per-page bucket
   *   accounting in the pages Map + ack watermark advance.
   */
  recordCompleted(type: SyncType, pageIndex?: number): void {
    const prog = this.progressMap.get(type);
    if (!prog) return;

    if (pageIndex === undefined) {
      // --- 旧路径：单页全局计数，逐字保留 ---
      prog.pageTaskCompleted++;
      prog.downloadPageDone++;

      dump(`[SyncProgressTracker] [recordCompleted] type: ${type}, downloadPageDone: ${prog.downloadPageDone}, downloadPageCount: ${prog.downloadPageCount}, downloadPageIndex: ${prog.downloadPageIndex}`);

      // Check if the current page has finished processing / 检查当前页是否处理完成
      if (prog.downloadPageDone >= prog.downloadPageCount && prog.downloadPageIndex !== -1) {
        const completedPage = prog.downloadPageIndex;
        prog.downloadPageIndex = -1; // Reset to avoid double triggering / 重置以防重复触发

        // 如果最后一页已收到，无需发送最终确认 ACK (已由服务端主动销毁缓存)
        // If the last page has been received, no need to send final confirmation ACK (cache cleared by server)
        if (prog.allPagesReceived) {
          dump(`[SyncProgressTracker] [recordCompleted] Last page (${completedPage}) completed for type: ${type}, skipping final ACK`);
        } else if (this.onPageComplete) {
          dump(`[SyncProgressTracker] [onPageComplete] triggering page ACK for type: ${type}, pageIndex: ${completedPage}`);
          this.onPageComplete(type, completedPage);
        }
      }

      this.notify();
      return;
    }

    // --- 新路径：多页在途，按 pageIndex 归账 ---
    const bucket = prog.pages.get(pageIndex);
    if (!bucket) {
      // 理论上 Page 元数据必然先于其明细到达；防御性地只推进全局计数，不做页归属
      // Page metadata should always precede its details; defensively bump the global
      // counter only, without page attribution
      dump(`[SyncProgressTracker] [recordCompleted] page bucket missing for pageIndex ${pageIndex}, type: ${type} — counting globally only`);
      prog.pageTaskCompleted++;
      this.notify();
      return;
    }

    if (bucket.completedCount >= bucket.totalCount) {
      // 幂等丢弃：服务端窗口回退整页重发的重复明细（completed 不重复累加，设计稿 §4.5）
      // Idempotent drop: duplicate detail from a server window-rollback full-page resend
      // (completed count must not double-accumulate, design §4.5)
      dump(`[SyncProgressTracker] [recordCompleted] duplicate detail for already-full page ${pageIndex}, type: ${type}, ignoring`);
      return;
    }

    bucket.completedCount++;
    prog.pageTaskCompleted++;

    // 15s 无明细停滞重发 timer：每次真正入账一条明细就重置倒计时
    // Stagnation-resend timer: reset the countdown on every genuine detail accounting
    this.scheduleStagnationRecheck(type);

    this.tryAdvanceAckWatermark(type, prog);
    this.notify();
  }

  /**
   * 尝试从 ackWatermark 起连续向前推进，找到最高的一段"页 ≤n 全部完成"，为该最高页触发一次 ack。
   * 只发一次 ack（覆盖多页），符合服务端"ack(n) 视为页 ≤n 全部完成"的最高水位语义（设计稿 §4.3）。
   * isLast 页永不触发 ack，也不会被跨越。
   *
   * Walk forward from ackWatermark to find the highest contiguous run of fully-completed pages
   * and fire a single ack for that highest page — matches the server's "ack(n) means pages <=n are
   * all done" highest-watermark semantics (design §4.3). Sends one ack covering multiple pages.
   * The isLast page is never acked and never skipped over.
   */
  private tryAdvanceAckWatermark(type: SyncType, prog: TypeProgress): void {
    let highestNewlyConfirmed = -1;
    while (true) {
      const bucket = prog.pages.get(prog.ackWatermark);
      if (!bucket) break; // 该页尚未收到 Page 元数据，前置条件不满足，停止推进
      if (bucket.isLast) break; // isLast 页不 ack，也不越过它继续推进
      if (bucket.completedCount < bucket.totalCount) break; // 未全部完成，minUnfinishedPage 命中，停止

      if (!bucket.acked) {
        bucket.acked = true;
        highestNewlyConfirmed = prog.ackWatermark;
      }
      prog.ackWatermark++;
    }

    if (highestNewlyConfirmed >= 0) {
      this.lastAckedPage.set(type, highestNewlyConfirmed);
      if (this.onPageComplete) {
        dump(`[SyncProgressTracker] [onPageComplete] ack watermark advanced, type: ${type}, highest confirmed pageIndex: ${highestNewlyConfirmed}`);
        this.onPageComplete(type, highestNewlyConfirmed);
      }
    }
  }

  /**
   * 空页（totalCount===0 且非 isLast）在新协商窗口模式下的立即"完成"判定入口，供 handleSyncPage 调用。
   * 空页在注册时 completedCount(0) 已等于 totalCount(0)，这里只是尝试推进水位线（可能因前面的页未完成而暂缓）。
   * Entry point for an empty page (totalCount===0, not isLast) under the new negotiated-window mode,
   * called from handleSyncPage. An empty page's bucket is already trivially "complete" at
   * registration (completedCount(0)===totalCount(0)); this just attempts to advance the watermark
   * (may be held back if an earlier page is still incomplete).
   */
  tryAckEmptyPage(type: SyncType, pageIndex: number): void {
    const prog = this.progressMap.get(type);
    if (!prog) return;
    if (!prog.pages.has(pageIndex)) return;
    this.tryAdvanceAckWatermark(type, prog);
  }

  private scheduleStagnationRecheck(type: SyncType): void {
    const existing = this.stagnationTimers.get(type);
    if (existing !== undefined) {
      window.clearTimeout(existing);
    }
    const timer = window.setTimeout(() => this.onStagnationTimeout(type), 15000);
    this.stagnationTimers.set(type, timer);
  }

  private onStagnationTimeout(type: SyncType): void {
    this.stagnationTimers.delete(type);
    if (this.isForcedComplete) return;
    const highest = this.lastAckedPage.get(type);
    if (highest === undefined) return;
    dump(`[SyncProgressTracker] [Stagnation] 15s with no new detail for type ${type}, resending ack for highest confirmed pageIndex ${highest}`);
    this.onPageComplete?.(type, highest);
    // 继续排下一次检查，连续多次丢包场景下每 15s 补发一次，直到有新明细到达或同步结束
    // Reschedule so repeated packet loss gets re-nudged every 15s until new detail arrives or sync ends
    this.scheduleStagnationRecheck(type);
  }

  /**
   * Set the authoritative total task count for download phase.
   * 一步到位地设置第三阶段（下载/处理）的权威任务总数。
   */
  setDownloadTotal(type: SyncType, total: number, syncDownChunkNum = 200): void {
    const prog = this.progressMap.get(type);
    if (!prog) return;
    prog.pageTaskTotal = total;
    prog.expectedPages = total === 0 ? 0 : Math.ceil(total / syncDownChunkNum);
    this.notify();
  }

  /**
   * Record page control message metadata.
   * 记录分页控制消息元数据。
   */
  recordPageProgress(type: SyncType, pageIndex: number, totalCount: number, isLast: boolean): void {
    const prog = this.progressMap.get(type);
    if (!prog) return;

    // 分页幂等：同一 pageIndex 重复到达（重传/乱序）时直接忽略，防止 receivedTaskTotal
    // 盲累加、allPagesReceived 被旧包覆盖，导致完成判定永远达不到，卡在 300s 超时分支
    if (prog.receivedPageIndexes.has(pageIndex)) {
      dump(`[SyncProgressTracker] [recordPageProgress] duplicate pageIndex ${pageIndex} for type: ${type}, ignoring`);
      return;
    }
    prog.receivedPageIndexes.add(pageIndex);

    // 多页在途归属登记（设计稿 §4.3，C3 新增）：与协议版本无关地无条件登记——Page 元数据字段一直都有
    // pageIndex，旧服务端下这个 bucket 只是不会被 recordCompleted(type, pageIndex) 推进，闲置无害
    // Per-page bucket registration (design §4.3, C3): registered unconditionally regardless of
    // protocol version — Page metadata always carried its own pageIndex field. On old servers this
    // bucket simply never gets advanced by recordCompleted(type, pageIndex); harmless no-op.
    prog.pages.set(pageIndex, { totalCount, completedCount: 0, acked: false, isLast });

    prog.downloadPageIndex = totalCount === 0 ? -1 : pageIndex;
    prog.downloadPageCount = totalCount;
    prog.downloadPageDone = 0;

    dump(`[SyncProgressTracker] [recordPageProgress] type: ${type}, pageIndex: ${pageIndex}, totalCount: ${totalCount}, isLast: ${isLast}`);

    // Accumulate precisely received total task count from server / 累加绝对精准的已收到任务总数
    prog.receivedTaskTotal += totalCount;

    // 如果收到最后一页标志，则标记所有页均已收到；isLast 只能置 true 不可回退，
    // 防止晚到的非末页（isLast: false）把已经确认的 allPagesReceived 覆盖回 false
    if (isLast) {
      prog.allPagesReceived = true;
    }

    // Correct UI total if received count exceeds it / 如果实际收到的数量超过了估算值，调大估算分母
    if (prog.pageTaskTotal < prog.receivedTaskTotal) {
      prog.pageTaskTotal = prog.receivedTaskTotal;
    }

    // Sync UI total with precise received total on final page / 如果是最后一页，使 UI 估算分母与实际接收总数对齐
    if (isLast) {
      prog.pageTaskTotal = prog.receivedTaskTotal;
    }

    this.notify();
  }

  /**
   * Force completion (100%) when the entire sync cycle completes.
   * 当同步完成时，强制将进度推到 100%。
   */
  forceComplete(): void {
    this.isForcedComplete = true;
    // 同步已结束（完成/取消/超时保底），清理所有停滞重发 timer（设计稿 §4.5）
    // Sync has ended (completed/cancelled/timeout fallback); clear all stagnation-resend timers
    for (const timer of this.stagnationTimers.values()) {
      window.clearTimeout(timer);
    }
    this.stagnationTimers.clear();
    this.lastReportedPct = 100;
    if (this.onChange) {
      this.onChange(100, this.getDetailText(), 'idle');
    }
    if (this.onProgressChange) {
      this.onProgressChange(100, this.getDetailText(), 'idle');
    }
  }

  /**
   * Check if a type is completely done with all uploads and server push pages.
   */
  isTypeFullyDone(type: SyncType): boolean {
    if (!this.activeTypes.has(type)) return true;
    const prog = this.progressMap.get(type);
    if (!prog) return true;
    // 使用实际收到的精准下载任务数加上传任务基数判定完成，防止提早判断导致清空 context
    const downloadCompleted = prog.pageTaskCompleted - prog.uploadTasksBase;
    return prog.uploadComplete && prog.allPagesReceived && downloadCompleted >= prog.receivedTaskTotal;
  }

  /**
   * Determine current active phase.
   * 判定当前活跃阶段 (哈希/上传/推送/空闲)。
   */
  getPhase(): SyncPhase {
    if (this.activeTypes.size === 0) return 'idle';

    if (this.hashProgress < 1) {
      return 'hash';
    }

    // Check if upload is complete (all active upload components must reach 100%)
    let uploadComplete = true;
    for (const type of ['folder', 'note', 'file', 'setting'] as SyncType[]) {
      if (!this.activeTypes.has(type)) continue;
      const prog = this.progressMap.get(type);
      if (prog && !prog.uploadComplete) {
        uploadComplete = false;
        break;
      }
    }

    return uploadComplete ? 'download' : 'upload';
  }

  /**
   * Calculate raw uncapped overall progress percentage [0, 100].
   * 计算原始未封顶的整体进度百分比。
   */
  getRawOverallPct(): number {
    if (this.isForcedComplete) return 100;
    if (this.activeTypes.size === 0) return 100;

    const phase = this.getPhase();
    if (phase === 'hash') {
      const hashPct = this.hashProgress * 5;
      return Math.min(5, Math.round(hashPct));
    }

    const hasSetting = this.activeTypes.has('setting');
    const uploadTotalWeight = hasSetting ? 20 : 15;

    const activeUploadComponents = ['folder', 'note', 'file', 'setting'].filter(
      type => this.activeTypes.has(type as SyncType)
    ) as SyncType[];

    let uploadSum = 0;
    for (const type of activeUploadComponents) {
      const prog = this.progressMap.get(type);
      if (prog && prog.uploadComplete) {
        uploadSum += 5;
      }
    }

    if (phase === 'upload') {
      return Math.min(5 + uploadTotalWeight, 5 + uploadSum);
    }

    const downloadTotalWeight = hasSetting ? 75 : 80;

    let downloadSum = 0;
    let activeDownloadCount = 0;

    for (const type of this.activeTypes) {
      const prog = this.progressMap.get(type);
      if (!prog) continue;

      if (prog.pageTaskTotal > 0) {
        activeDownloadCount++;
        const taskRatio = prog.pageTaskCompleted / prog.pageTaskTotal;
        downloadSum += taskRatio;
      }
    }

    // If no download pages are active yet, the ratio should be 0 instead of 1 to prevent progress jump to 99%.
    // 如果尚未激活任何下载分页，比例应为 0 而非 1，以防进度条直接跳跃到 99%。
    const avgDownloadRatio = activeDownloadCount > 0 ? (downloadSum / activeDownloadCount) : 0;
    const downloadPct = avgDownloadRatio * downloadTotalWeight;

    return Math.min(100, Math.round(5 + uploadTotalWeight + downloadPct));
  }

  /**
   * Calculate overall progress percentage, capped at 99% until forceComplete is called.
   * 计算整体进度百分比，在未正式完成前限制最高为 99%。
   */
  getOverallPct(): number {
    if (this.isForcedComplete) return 100;

    const raw = this.getRawOverallPct();
    let overall = Math.min(99, raw);

    // Enforce monotonic increase / 确保进度只增不减
    if (overall < this.lastReportedPct) {
      overall = this.lastReportedPct;
    } else {
      this.lastReportedPct = overall;
    }

    return overall;
  }

  /**
   * Generate detail text for tooltip.
   * 生成进度明细文本。
   */
  getDetailText(): string {
    const parts: string[] = [];
    
    // Custom label mappings / 自定义标签映射
    const labels: Record<SyncType, string> = {
      note: $("ui.status.label_note"),
      file: $("ui.status.label_file"),
      setting: $("ui.status.label_setting"),
      folder: $("ui.status.label_folder")
    };

    if (this.hashProgress < 1) {
      parts.push($("ui.status.hash_calc", { pct: Math.round(this.hashProgress * 100) }));
    }

    for (const type of this.activeTypes) {
      const prog = this.progressMap.get(type);
      if (!prog) continue;

      const label = labels[type];
      if (prog.pageTaskTotal > 0) {
        parts.push(`${label} ${prog.pageTaskCompleted}/${prog.pageTaskTotal}`);
      } else if (prog.downloadPageIndex !== -1) {
        parts.push($("ui.status.page_num", { label, page: prog.downloadPageIndex + 1 }));
      } else if (!prog.uploadComplete) {
        parts.push($("ui.status.sending", { label }));
      }
    }

    return parts.join(' · ');
  }

  private fireNotify(pct: number, phase: SyncPhase): void {
    this.lastNotifyTime = Date.now();
    this.lastNotifiedPct = pct;
    this.lastNotifiedPhase = phase;
    this.notifyPending = false;
    const detail = this.getDetailText();
    if (this.onChange) {
      this.onChange(pct, detail, phase);
    }
    if (this.onProgressChange) {
      this.onProgressChange(pct, detail, phase);
    }
  }

  private notify(): void {
    const pct = this.getOverallPct();
    const phase = this.getPhase();
    const changed = pct !== this.lastNotifiedPct || phase !== this.lastNotifiedPhase;
    const now = Date.now();
    const elapsed = now - this.lastNotifyTime;

    // 整数百分比变化或阶段切换（start/end）立即触发；否则节流合并
    if (changed || elapsed >= this.NOTIFY_THROTTLE_MS) {
      if (this.notifyTimer !== null) {
        window.clearTimeout(this.notifyTimer);
        this.notifyTimer = null;
      }
      this.fireNotify(pct, phase);
      return;
    }

    this.notifyPending = true;
    if (this.notifyTimer === null) {
      this.notifyTimer = window.setTimeout(() => {
        this.notifyTimer = null;
        if (this.notifyPending) {
          this.fireNotify(this.getOverallPct(), this.getPhase());
        }
      }, this.NOTIFY_THROTTLE_MS - elapsed);
    }
  }
}
