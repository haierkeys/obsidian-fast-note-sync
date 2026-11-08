// Cloud preview only suppresses downloads: server deletions and mtime updates still apply to
// attachments that exist locally.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const noop = () => {};
class TFile { constructor(path) { this.path = path; this.stat = { size: 1, mtime: 1 }; } }
const code = ts.transpileModule(fs.readFileSync('src/lib/sync/operator_file.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const module = { exports: {} };
vm.runInNewContext(code, { module, exports: module.exports, console,
  window: { setTimeout: fn => { fn(); return 1; } },
  require: id => id === 'obsidian' ? { TFile, normalizePath: p => p, Platform: { isMobile: false } }
    : id.includes('file_cloud_preview') ? { FileCloudPreview: { isRestrictedType: ext => ext === '.png' } }
    : id.includes('helpers') ? new Proxy({ isPathExcluded: () => false, isLargeBinarySyncRisk: () => false,
        checkAndNotifyCaseConflict: () => false, getPluginDir: () => 'plugin',
        vaultDelete: (vault, f) => vault.delete(f) }, { get: (t, k) => t[k] ?? noop })
    : id.includes('sync_log_manager') ? { SyncLogManager: { getInstance: () => ({ addLog: noop }) } }
    : {} });
const ops = module.exports;

function fixture(restricted) {
  const file = new TFile('image.png');
  const deleted = [], modified = [], completed = [];
  const plugin = {
    settings: { syncEnabled: true, cloudPreviewEnabled: true, cloudPreviewTypeRestricted: restricted },
    app: { vault: { getFileByPath: () => file, delete: async f => deleted.push(f.path), trash: async f => deleted.push(f.path),
      readBinary: async () => new ArrayBuffer(1), modifyBinary: async (f, _b, o) => modified.push(o) } },
    lockManager: { withLock: async (_k, fn) => fn() },
    addIgnoredFile: noop, removeIgnoredFile: noop, lastSyncPathDeleted: new Set(), lastSyncMtime: new Map(),
    fileHashManager: { removeFileHash: noop }, concurrencyLimiter: { releaseSlot: noop },
    localStorageManager: { getMetadata: k => k === 'isInitSync' ? true : 0, setMetadata: noop },
    fileSyncTasks: { failed: 0 }, recordSyncCompleted: (...a) => completed.push(a),
  };
  return { plugin, deleted, modified, completed };
}

for (const restricted of [true, false]) {
  const d = fixture(restricted);
  await ops.receiveFileSyncDelete({ path: 'image.png', pageIndex: 1 }, d.plugin);
  assert.deepEqual(d.deleted, ['image.png'], 'remote deletion applies with cloud preview');
  assert.deepEqual(d.completed, [['file', 1]]);
  const m = fixture(restricted);
  await ops.receiveFileSyncMtime({ path: 'image.png', pageIndex: 2, mtime: 5, ctime: 1 }, m.plugin);
  assert.equal(m.modified.length, 1, 'mtime update applies to an existing local file');
  assert.equal(m.modified[0].mtime, 5);
}
console.log('PASS: cloud preview applies remote deletions and mtime updates');
