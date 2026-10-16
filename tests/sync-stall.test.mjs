import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const noop = () => {};
const module = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('src/lib/sync/operator.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
vm.runInNewContext(code, { module, exports: module.exports, console, window: { setTimeout: () => 1, clearTimeout: noop },
  require: id => id === 'obsidian' ? { normalizePath: x => x, TFile: class {}, Platform: {} }
    : id.includes('helpers') ? { dump: noop }
    : id.includes('sync_log_manager') ? { SyncLogManager: { getInstance: () => ({ addOrUpdateLog: noop }) } }
    : id.includes('i18n') ? { $: k => k } : {} });
const { isSyncStalled, SYNC_STALL_RESTART_MS } = module.exports;

const mk = () => ({
  noteSyncTasks: { completed: 1, failed: 0 }, fileSyncTasks: { completed: 5, failed: 0 },
  folderSyncTasks: { completed: 0 }, configSyncTasks: { completed: 0 },
  uploadedChunksCount: 0, downloadedChunksCount: 0,
  progressTracker: { getOverallPct: () => 40 },
  concurrencyLimiter: { activeKeys: new Set(), queue: [] },
  fileDownloadSessions: new Map(), isSyncRequesting: false,
});
const t0 = 1_000_000;
const p = mk();
assert.equal(isSyncStalled(p, 'ctx', t0), false, 'first observation only records the baseline');
assert.equal(isSyncStalled(p, 'ctx', t0 + SYNC_STALL_RESTART_MS - 1), false);
assert.equal(isSyncStalled(p, 'ctx', t0 + SYNC_STALL_RESTART_MS + 1), true, 'idle and unchanged past the limit');

// Progress resets the clock
p.fileSyncTasks.completed++;
assert.equal(isSyncStalled(p, 'ctx', t0 + 2 * SYNC_STALL_RESTART_MS), false);
assert.equal(isSyncStalled(p, 'ctx', t0 + 2 * SYNC_STALL_RESTART_MS + 1000), false);

// Work in flight is never a stall, however long it takes
const q = mk();
q.concurrencyLimiter.activeKeys.add('upload_x');
isSyncStalled(q, 'ctx2', t0);
assert.equal(isSyncStalled(q, 'ctx2', t0 + 10 * SYNC_STALL_RESTART_MS), false);
q.concurrencyLimiter.activeKeys.clear();
q.fileDownloadSessions.set('s', {});
assert.equal(isSyncStalled(q, 'ctx2', t0 + 10 * SYNC_STALL_RESTART_MS), false);

// A new context starts a fresh baseline
const r = mk();
isSyncStalled(r, 'a', t0);
assert.equal(isSyncStalled(r, 'b', t0 + 10 * SYNC_STALL_RESTART_MS), false);

// Exercise the full completion check: long-running active work must not be
// forced complete by the old wall-clock timeout before the idle watchdog runs.
let now = 50_000_000;
class FakeDate extends Date {
  static now() { return now; }
}
const integrationModule = { exports: {} };
const integrationCode = ts.transpileModule(fs.readFileSync('src/lib/sync/operator.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
vm.runInNewContext(integrationCode, {
  module: integrationModule,
  exports: integrationModule.exports,
  console,
  Date: FakeDate,
  WebSocket: { OPEN: 1 },
  window: { setTimeout: () => 1, clearInterval: noop },
  require: id => id === 'obsidian' ? { normalizePath: x => x, TFile: class {}, TFolder: class {} }
    : id.includes('helpers') ? { dump: noop }
    : id.includes('sync_log_manager') ? { SyncLogManager: { getInstance: () => ({ addOrUpdateLog: noop }) } }
    : id.includes('i18n') ? { $: key => key }
    : {},
});
const { checkSyncCompletion } = integrationModule.exports;
const statusUpdates = [];
const failIfReset = () => { throw new Error('active long-running sync must not be reset'); };
const longRunning = {
  syncState: { activeSyncContext: 'long-running', progressCheckIntervalId: 1 },
  settings: { syncEnabled: true, configSyncEnabled: false, isShowNotice: false },
  noteSyncTasks: { completed: 4, failed: 0 }, fileSyncTasks: { completed: 2, failed: 0 },
  folderSyncTasks: { completed: 0, failed: 0 }, configSyncTasks: { completed: 0, failed: 0 },
  concurrencyLimiter: { activeKeys: new Set(['uploading.bin']), queue: [] },
  fileDownloadSessions: new Map(), isSyncRequesting: false, isSyncing: true,
  websocket: { ws: { readyState: 1, bufferedAmount: 0 }, isOpen: true },
  progressTracker: { getOverallPct: () => 42, getDetailText: () => '',
    isTypeFullyDone: () => false, forceComplete: failIfReset },
  syncPageStateMap: new Map(), resetSyncTasks: failIfReset,
  updateStatusBar: (...args) => statusUpdates.push(args),
};
const startedAt = now - 6 * 60 * 60 * 1000;
checkSyncCompletion(longRunning, 1, startedAt, 'long-running');
now += 6 * 60 * 60 * 1000;
checkSyncCompletion(longRunning, 1, startedAt, 'long-running');
assert.equal(longRunning.syncState.activeSyncContext, 'long-running');
assert.equal(longRunning.isSyncing, true);
assert.equal(statusUpdates.length, 2, 'ongoing transfer remains visible after six hours');
console.log('sync stall watchdog tests passed');
