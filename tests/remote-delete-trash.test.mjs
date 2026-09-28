import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const noop = () => {};
class TFile { constructor(path) { this.path = path; } }
class TFolder { constructor(path) { this.path = path; this.children = []; } }
const helpers = { dump: noop, dumpError: noop, isPathExcluded: () => false,
  isFolderSyncPathExcluded: () => false, configIsPathExcluded: () => false,
  isPathInConfigSyncDirs: () => true, waitForFolderEmpty: async () => true,
  checkAndNotifyCaseConflict: () => false, isLargeBinarySyncRisk: () => false };
let permanentCalls = 0;
const forbidden = () => { permanentCalls++; throw new Error('permanent deletion must not be used'); };
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, console,
    window: { setTimeout: fn => { fn(); return 1; } },
    require: id => id === 'obsidian' ? { TFile, TFolder, normalizePath: x => x.replace(/\\/g, '/') }
      : id.includes('helpers_obsidian_bypass') ? { ...helpers, vaultDelete: forbidden }
      : id.includes('helpers') ? { ...helpers, vaultDelete: forbidden }
      : id.includes('sync_log_manager') ? { SyncLogManager: { getInstance: () => ({ addLog: noop }) } }
      : {} });
  return module.exports;
}
const note = load('src/lib/sync/operator_note.ts');
const file = load('src/lib/sync/operator_file.ts');
const folder = load('src/lib/sync/operator_folder.ts');
const config = load('src/lib/sync/operator_config.ts');
function fixture(kind, fail = false) {
  const path = kind === 'setting' ? '.obsidian/example.json' : 'example';
  const item = kind === 'folder' ? new TFolder(path) : new TFile(path);
  const calls = [], removedHashes = [], completed = [];
  const trash = async (value, system) => {
    calls.push([value, system]);
    if (fail) throw new Error('trash unavailable');
  };
  const p = {
    settings: { syncEnabled: true, configSyncEnabled: true },
    app: { vault: { getFileByPath: () => item, getAbstractFileByPath: () => item,
      trash, delete: forbidden,
      adapter: { exists: async () => true, trashLocal: path => trash(path, false), remove: forbidden } } },
    lockManager: { withLock: async (_, fn) => fn() },
    addIgnoredFile: noop, removeIgnoredFile: noop, ignoredConfigFiles: new Set(),
    lastSyncPathDeleted: new Set(), lastSyncMtime: new Map(), pendingNoteModifies: new Map(),
    fileHashManager: { removeFileHash: path => removedHashes.push(path) },
    configHashManager: { isReady: () => true, removeFileHash: path => removedHashes.push(path) },
    configManager: { removeFileState: noop }, folderSnapshotManager: { removeFolder: noop },
    localStorageManager: { savePending: noop, getMetadata: () => 0, setMetadata: noop },
    concurrencyLimiter: { releaseSlot: noop },
    noteSyncTasks: { failed: 0 }, fileSyncTasks: { failed: 0 }, folderSyncTasks: { failed: 0 }, configSyncTasks: { failed: 0 },
    recordSyncCompleted: (...args) => completed.push(args)
  };
  return { p, path, item, calls, removedHashes, completed };
}
for (const [kind, handler, stats] of [
  ['note', note.receiveNoteSyncDelete, 'noteSyncTasks'],
  ['file', file.receiveFileSyncDelete, 'fileSyncTasks'],
  ['folder', folder.receiveFolderSyncDelete, 'folderSyncTasks'],
  ['setting', config.receiveConfigSyncDelete, 'configSyncTasks']
]) {
  for (const fail of [false, true]) {
    const f = fixture(kind, fail);
    await handler({ path: f.path, pageIndex: 3 }, f.p);
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0][1], false, 'always use local rather than system trash');
    assert.equal(f.p[stats].failed, fail ? 1 : 0);
    assert.deepEqual(f.completed, [[kind, 3]], 'account for processing once on success or failure');
    if (fail) assert.equal(f.removedHashes.length, 0, 'failed trash must preserve sync hashes');
  }
}
{
  const f = fixture('folder');
  helpers.waitForFolderEmpty = async () => false;
  await load('src/lib/sync/operator_folder.ts').receiveFolderSyncDelete({ path: f.path }, f.p);
  assert.equal(f.calls.length, 0, 'non-empty folders retain the existing skip safeguard');
}
{
  const actual = load('src/lib/utils/helpers.ts');
  const p = { settings: { syncExcludeWhitelist: '.trash/**' }, app: { vault: { configDir: '.obsidian' } } };
  for (const path of ['.trash', '.trash/note.md', '.trash\\nested\\file.png']) {
    assert.equal(actual.isPathExcluded(path, p), true);
    assert.equal(actual.configIsPathExcluded(path, p), true);
    assert.equal(actual.isFolderSyncPathExcluded(path, p), true);
  }
}
console.log('PASS: local trash for notes/files/folders/config, failure preservation, non-empty folders and trash exclusion');

for (const [kind, handler] of [['note', note.receiveNoteSyncRename], ['file', file.receiveFileSyncRename], ['folder', folder.receiveFolderSyncRename]]) {
  const f = fixture(kind, true);
  const source = kind === 'folder' ? new TFolder('old') : new TFile('old');
  const target = kind === 'folder' ? new TFolder('new') : new TFile('new');
  const get = path => path === 'old' ? source : target;
  f.p.app.vault.getFileByPath = get;
  f.p.app.vault.getAbstractFileByPath = get;
  let renames = 0;
  f.p.app.vault.rename = async () => { renames++; };
  f.p.lastSyncPathRenamed = new Set();
  f.p.fileDownloadSessions = new Map();
  await handler({ oldPath: 'old', path: 'new', pageIndex: 2 }, f.p);
  assert.equal(f.calls.length, 1, 'rename collision must try to trash the old target');
  assert.equal(f.calls[0][0], target);
  assert.equal(renames, 0, 'failed target recovery must abort rename');
}
assert.equal(permanentCalls, 0, 'no fallback to permanent removal on any error path');
console.log('PASS: rename targets are recoverable and trash failures abort replacement');
