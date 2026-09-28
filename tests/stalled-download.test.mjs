import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const noop = () => {};
const helpers = { dump: noop, dumpError: noop, isPathExcluded: () => false,
  hashContent: x => x, hashContentAsync: async x => x, getPluginDir: () => '.plugin',
  checkAndNotifyCaseConflict: () => false };
const logs = { addLog: noop, addOrUpdateLog: noop, logReceivedMessage: noop };
const module = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('src/lib/sync/operator_file.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
vm.runInNewContext(code, { module, exports: module.exports, console,
  window: { setTimeout: () => 1, clearTimeout: noop },
  require: id => id === 'obsidian' ? { normalizePath: x => x, TFile: class {}, Platform: { isMobile: false } }
    : id.includes('helpers') ? helpers
    : id.includes('sync_log_manager') ? { SyncLogManager: { getInstance: () => logs } }
    : {} });
const { sweepStalledDownloadSessions } = module.exports;

const removed = [], released = [], completed = [];
const now = 1_000_000;
const plugin = {
  fileDownloadSessions: new Map([
    ['stale-id', { path: 'a.mp3', sessionId: 'stale-id', totalChunks: 9, size: 1, pageIndex: 2,
      tempDir: '.plugin/temp-chunks/stale-id', downloadedChunks: new Set(), lastActivityAt: now - 130000 }],
    ['temp_b.txt', { path: 'b.txt', sessionId: '', totalChunks: 0, size: 1, pageIndex: 3,
      tempDir: '.plugin/temp-chunks/init_hash', downloadedChunks: new Set(), lastActivityAt: now - 130000 }],
    ['live-id', { path: 'c.jpg', sessionId: 'live-id', totalChunks: 4, size: 1, pageIndex: 2,
      tempDir: '.plugin/temp-chunks/live-id', downloadedChunks: new Set([0]), lastActivityAt: now - 5000 }],
  ]),
  app: { vault: { adapter: { exists: async () => true, rmdir: async p => removed.push(p) } } },
  fileSyncTasks: { failed: 0 },
  recordSyncCompleted: (type, page) => completed.push([type, page]),
  concurrencyLimiter: { releaseSlot: key => released.push(key) },
};

assert.equal(await sweepStalledDownloadSessions(plugin, 120000, now), 2);
assert.deepEqual([...plugin.fileDownloadSessions.keys()], ['live-id']);
assert.deepEqual(released.sort(), ['download_a.mp3', 'download_b.txt']);
assert.deepEqual(completed, [['file', 2], ['file', 3]]);
assert.equal(plugin.fileSyncTasks.failed, 2);
assert.ok(!removed.includes('.plugin/temp-chunks'), 'must never remove the whole temp-chunks base');
assert.deepEqual(removed.sort(), ['.plugin/temp-chunks/init_hash', '.plugin/temp-chunks/stale-id']);
// Throttled: an immediate second sweep does nothing
assert.equal(await sweepStalledDownloadSessions(plugin, 0, now + 1000), 0);

// Cleanup failure must still release the slot and record the failure and page
{
  const rel = [], done = [];
  const p2 = { ...plugin, fileSyncTasks: { failed: 0 },
    fileDownloadSessions: new Map([['x', { path: 'x.bin', sessionId: 'x', totalChunks: 2, size: 1, pageIndex: 7,
      tempDir: '.plugin/temp-chunks/x', downloadedChunks: new Set(), lastActivityAt: now }]]),
    app: { vault: { adapter: { exists: async () => true, rmdir: async () => { throw new Error('EBUSY'); } } } },
    recordSyncCompleted: (type, page) => done.push([type, page]),
    concurrencyLimiter: { releaseSlot: key => rel.push(key) } };
  assert.equal(await sweepStalledDownloadSessions(p2, 120000, now + 200000), 1);
  assert.equal(p2.fileDownloadSessions.size, 0);
  assert.deepEqual(rel, ['download_x.bin']);
  assert.deepEqual(done, [['file', 7]]);
  assert.equal(p2.fileSyncTasks.failed, 1);
}
console.log('stalled download watchdog tests passed');
