import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const noop = () => {};
class MockFile {}
const helpers = { dump: noop, dumpError: noop, isPathExcluded: () => false,
  hashContent: x => x, hashContentAsync: async x => x, getPluginDir: () => '.plugin',
  checkAndNotifyCaseConflict: () => false };
const logs = { addLog: noop, addOrUpdateLog: noop, logReceivedMessage: noop };
function load(file, extra = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, console,
    window: { setTimeout: fn => { fn(); return 1; }, clearTimeout: noop },
    ...globals,
    require: id => id === 'obsidian' ? { normalizePath: x => x, TFile: MockFile, Platform: { isMobile: false } }
      : id.includes('helpers') ? helpers
      : id.includes('sync_log_manager') ? { SyncLogManager: { getInstance: () => logs } }
      : extra[id] || {} });
  return module.exports;
}

{
  const { SyncProgressTracker } = load('src/lib/sync/sync_progress_tracker.ts', {}, {
    window: { setTimeout: () => 1, clearTimeout: noop }
  });
  const tracker = new SyncProgressTracker();
  tracker.reset(['file']);
  tracker.recordPageProgress('file', 0, 2, true, true);
  tracker.recordUploadComplete('file');
  for (let i=0; i<10; i++) tracker.recordCompleted('file');
  assert.equal(tracker.isTypeFullyDone('file'), false, 'live ACKs cannot complete unfinished negotiated pages');
  tracker.recordCompleted('file', 0);
  assert.equal(tracker.isTypeFullyDone('file'), false);
  tracker.recordCompleted('file', 0);
  assert.equal(tracker.isTypeFullyDone('file'), true);
}

console.log('PASS: negotiated page completion');
{
  const { checkSyncCompletion } = load('src/lib/sync/operator.ts', {
    '../../i18n/lang': { $: key => key }
  }, { WebSocket: { OPEN: 1 } });
  for (const failed of [0, 1]) {
    const metadata = new Map();
    const stats = () => ({ needUpload: 0, needModify: 0, needSyncMtime: 0, needDelete: 0, failed: 0 });
    const p = {
      syncState: { activeSyncContext: 'current', newConflictedPathsThisRound: new Set(), offlineGuardSkippedThisRound: false },
      settings: { syncEnabled: true, configSyncEnabled: true },
      websocket: { ws: { readyState: 1, bufferedAmount: 0 } },
      progressTracker: { isTypeFullyDone: () => true, getOverallPct: () => 100, forceComplete: noop },
      fileDownloadSessions: new Map(), syncPageStateMap: new Map(),
      noteSyncTasks: stats(), fileSyncTasks: { ...stats(), failed }, configSyncTasks: stats(), folderSyncTasks: stats(),
      resetSyncTasks: noop, updateStatusBar: noop, statusBarManager: { updateConflictBadge: noop },
      expectedSyncCount: 4, localStorageManager: { getMetadata: key => metadata.get(key), setMetadata: (key,value) => metadata.set(key,value) }
    };
    checkSyncCompletion(p);
    assert.equal(metadata.has('isInitSync'), failed === 0);
    assert.equal(metadata.has('lastSyncSuccessTime'), failed === 0);
  }
}
console.log('PASS: failed rounds preserve success metadata; successful rounds still update it');
