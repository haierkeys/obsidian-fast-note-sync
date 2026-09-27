import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const noop = () => {};
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
    require: id => id === 'obsidian' ? { normalizePath: x => x, TFile: class {}, Platform: { isMobile: false } }
      : id.includes('helpers') ? helpers
      : id.includes('sync_log_manager') ? { SyncLogManager: { getInstance: () => logs } }
      : extra[id] || {} });
  return module.exports;
}
const { ConcurrencyLimiter } = load('src/lib/sync/concurrency_limiter.ts');
{
  const statuses = [];
  const fail = () => { throw new Error('unfinished sync must not be reset or completed'); };
  const { checkSyncCompletion } = load('src/lib/sync/operator.ts', {
    '../../i18n/lang': { $: key => key }
  }, { WebSocket: { OPEN: 1 } });
  const p = {
    syncState: { activeSyncContext: 'long-running' }, isSyncing: true,
    settings: { syncEnabled: true, configSyncEnabled: true },
    websocket: { ws: { readyState: 1, bufferedAmount: 0 } },
    fileDownloadSessions: new Map(),
    progressTracker: { isTypeFullyDone: () => false, getOverallPct: () => 100,
      getDetailText: () => 'pending uploads', forceComplete: fail },
    resetSyncTasks: fail,
    updateStatusBar: (...args) => statuses.push(args)
  };
  for (const elapsed of [300001, 6 * 60 * 60 * 1000]) {
    checkSyncCompletion(p, undefined, Date.now() - elapsed, 'long-running');
    assert.equal(p.syncState.activeSyncContext, 'long-running');
    assert.equal(p.isSyncing, true);
    assert.equal(statuses.at(-1)[1], 99);
  }
  const count = statuses.length;
  checkSyncCompletion(p, undefined, Date.now() - 360000, 'old-context');
  assert.equal(statuses.length, count, 'stale timer cannot update current sync');
}
const limiter = new ConcurrencyLimiter({ settings: { concurrencyControlEnabled: true, maxConcurrentUploads: 1 } });
await limiter.waitForSlot('first');
const queued = Array.from({ length: 30 }, (_, i) => limiter.waitForSlot('queued-' + i));
limiter.clear();
assert.ok((await Promise.all(queued)).every(acquired => acquired === false), 'cancelled waiters must not start reading attachments');
assert.equal(limiter.activeKeys.size, 0, 'disconnect must not reintroduce all queued keys');
await limiter.waitForSlot('after-reconnect');
assert.equal(limiter.activeKeys.size, 1);
limiter.releaseSlot('after-reconnect');
assert.equal(limiter.activeKeys.size, 0);

const note = load('src/lib/sync/operator_note.ts');
function fixture(content = 'same', base = 'same', pending = true) {
  const file = { path: 'test.md', stat: { mtime: 20, size: content.length } };
  const completed = [], released = [], writes = [], hashes = [];
  const p = {
    settings: { syncEnabled: true },
    syncState: { pendingNotePushPageIndex: new Map([['test.md', 3]]), conflictedPaths: new Set(), newConflictedPathsThisRound: new Set() },
    pendingNoteModifies: new Map(pending ? [['test.md', content]] : []), pendingNoteDeleteAcks: new Set(),
    lastSyncMtime: new Map([['test.md', 10]]),
    concurrencyLimiter: { releaseSlot: path => released.push(path) },
    recordSyncCompleted: (type, page) => completed.push([type, page]),
    localStorageManager: { savePending: noop, setConflictedPaths: noop, getMetadata: () => 0, setMetadata: noop },
    lockManager: { withLock: async (_, fn) => fn() }, addIgnoredFile: noop, removeIgnoredFile: noop,
    statusBarManager: { updateConflictBadge: noop }, noteSyncTasks: { failed: 0 },
    fileHashManager: { getPathHash: () => base, getValidHash: () => content, setFileHash: (...a) => hashes.push(a) },
    app: { vault: { getFileByPath: () => file, read: async () => content,
      modify: async (_, text) => { writes.push(text); }, adapter: { exists: async () => true, write: async (path, text) => writes.push([path,text]) } } }
  };
  return { p, completed, released, writes, hashes };
}
{
  const f = fixture();
  await note.receiveNoteSyncMtime({ path: 'test.md', mtime: 30, ctime: 1 }, f.p);
  assert.deepEqual(f.released, ['test.md']);
  assert.deepEqual(f.completed, [['note', 3]]);
  assert.equal(f.p.syncState.pendingNotePushPageIndex.size, 0);
  assert.equal(f.p.pendingNoteModifies.size, 0);
}
{
  const f = fixture('same', 'old');
  await note.receiveNoteSyncModify({ path: 'test.md', content: 'same', contentHash: 'same', mtime: 30, ctime: 1, pageIndex: 4 }, f.p);
  assert.equal(f.p.syncState.conflictedPaths.size, 0, 'identical pending content is not a conflict');
  assert.deepEqual(f.writes, ['same']);
  assert.equal(f.p.pendingNoteModifies.size, 0);
}
{
  const f = fixture('local-edit', 'base');
  await note.receiveNoteSyncModify({ path: 'test.md', content: 'base', contentHash: 'base', mtime: 30, ctime: 1 }, f.p);
  assert.equal(f.p.syncState.conflictedPaths.size, 0, 'unchanged server baseline is not a conflict');
  assert.equal(f.writes.length, 0, 'local edit must survive baseline replay');
  assert.equal(f.p.pendingNoteModifies.get('test.md'), 'local-edit');
}
{
  const f = fixture('local-edit', 'base');
  await note.receiveNoteSyncModify({ path: 'test.md', content: 'remote-edit', contentHash: 'remote-edit', mtime: 30, ctime: 1 }, f.p);
  assert.equal(f.p.syncState.conflictedPaths.size, 1, 'true two-sided edits remain conflicts');
  assert.ok(f.writes.some(x => Array.isArray(x) && x[1] === 'remote-edit'));
  assert.ok(!f.writes.includes('remote-edit'), 'must not overwrite local edit');
}
{
  const received = [];
  const actions = new Proxy({}, { get: (_, key) => key });
  const { WebSocketManager } = load('src/lib/sync/websocket_manager.ts', {
    './websocket_action': actions,
    './operator': { receiveOperators: new Map([['NoteSyncMtime', x => received.push(x)]]) }
  });
  const manager = Object.create(WebSocketManager.prototype);
  manager.client = { notifyActivity: noop };
  manager.plugin = { settings: { vault: 'test' }, syncState: { activeSyncContext: 'current' }, pendingNoteModifies: new Map([['test.md', 'hash']]) };
  manager.handleStructuredMessage('NoteSyncMtime', { code: 200, vault: 'test', data: { path: 'test.md' } });
  assert.equal(received.length, 1, 'legacy contextless ACK for pending upload must be accepted');
  manager.handleStructuredMessage('NoteSyncMtime', { code: 200, context: 'old', data: { path: 'test.md' } });
  manager.handleStructuredMessage('NoteSyncMtime', { code: 200, data: { path: 'unrelated.md' } });
  manager.handleStructuredMessage('NoteSyncMtime', { code: 200, vault: 'other', data: { path: 'test.md' } });
  assert.equal(received.length, 1, 'stale contexts, unrelated paths and other vaults must stay rejected');
}
console.log('PASS: queue recovery, mtime ACK release/page attribution/context routing, identical replay, baseline replay, true conflict protection');

{
  let opened = 0, closed = 0;
  class Channel {
    constructor() {
      opened += 2;
      this.port1 = { onmessage: null, close: () => closed++ };
      this.port2 = { close: () => closed++, postMessage: () => queueMicrotask(() => this.port1.onmessage()) };
    }
  }
  const realHelpers = load('src/lib/utils/helpers.ts', {}, { MessageChannel: Channel });
  for (let i = 0; i < 100; i++) await realHelpers.yieldToMain();
  assert.equal(opened, 200);
  assert.equal(closed, opened, 'every scan yield must close both MessagePorts');
  console.log('PASS: 100 scan yields release all 200 MessagePorts');
}
