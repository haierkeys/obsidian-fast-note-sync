// src/lib/sync/sync_progress_tracker.ts
import { dump } from "../utils/helpers";

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

  getActiveTypes(): SyncType[] {
    return Array.from(this.activeTypes);
  }

  getTypeTaskTotal(type: SyncType): number {
    return this.progressMap.get(type)?.pageTaskTotal || 0;
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
        expectedPages: 0
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
   */
  recordCompleted(type: SyncType): void {
    const prog = this.progressMap.get(type);
    if (!prog) return;

    prog.pageTaskCompleted++;
    prog.downloadPageDone++;

    dump(`[SyncProgressTracker] [recordCompleted] type: ${type}, downloadPageDone: ${prog.downloadPageDone}, downloadPageCount: ${prog.downloadPageCount}, downloadPageIndex: ${prog.downloadPageIndex}`);

    // Check if the current page has finished processing / 检查当前页是否处理完成
    if (prog.downloadPageDone >= prog.downloadPageCount && prog.downloadPageIndex !== -1) {
      const completedPage = prog.downloadPageIndex;
      prog.downloadPageIndex = -1; // Reset to avoid double triggering / 重置以防重复触发
      if (this.onPageComplete) {
        dump(`[SyncProgressTracker] [onPageComplete] triggering page ACK for type: ${type}, pageIndex: ${completedPage}`);
        this.onPageComplete(type, completedPage);
      }
    }

    this.notify();
  }

  /**
   * Set the authoritative total task count for download phase.
   * 一步到位地设置第三阶段（下载/处理）的权威任务总数。
   */
  setDownloadTotal(type: SyncType, total: number, syncDownChunkNum = 100): void {
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

    prog.downloadPageIndex = totalCount === 0 ? -1 : pageIndex;
    prog.downloadPageCount = totalCount;
    prog.downloadPageDone = 0;

    dump(`[SyncProgressTracker] [recordPageProgress] type: ${type}, pageIndex: ${pageIndex}, totalCount: ${totalCount}, isLast: ${isLast}`);

    // Accumulate precisely received total task count from server / 累加绝对精准的已收到任务总数
    prog.receivedTaskTotal += totalCount;
    
    // 如果收到最后一页标志，则标记所有页均已收到
    prog.allPagesReceived = isLast;

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
    this.lastReportedPct = 100;
    if (this.onChange) {
      this.onChange(100, this.getDetailText(), 'idle');
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
      note: '笔记',
      file: '文件',
      setting: '配置',
      folder: '文件夹'
    };

    if (this.hashProgress < 1) {
      parts.push(`哈希计算: ${Math.round(this.hashProgress * 100)}%`);
    }

    for (const type of this.activeTypes) {
      const prog = this.progressMap.get(type);
      if (!prog) continue;

      const label = labels[type];
      if (prog.pageTaskTotal > 0) {
        parts.push(`${label} ${prog.pageTaskCompleted}/${prog.pageTaskTotal}`);
      } else if (prog.downloadPageIndex !== -1) {
        parts.push(`${label} 页码 ${prog.downloadPageIndex + 1}`);
      } else if (!prog.uploadComplete) {
        parts.push(`${label} 发送中`);
      }
    }

    return parts.join(' · ');
  }

  private notify(): void {
    if (this.onChange) {
      this.onChange(this.getOverallPct(), this.getDetailText(), this.getPhase());
    }
  }
}
