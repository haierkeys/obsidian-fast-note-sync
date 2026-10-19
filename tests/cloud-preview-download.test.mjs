import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/lib/sync/operator_file.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(code, { module, exports: module.exports, console, require(id) {
  if (id === 'obsidian') return { normalizePath: p => p, Platform: { isMobile: false } };
  if (id === '../storage/file_cloud_preview') return { FileCloudPreview: { isRestrictedType: ext => ['.pdf', '.png'].includes(ext) } };
  if (id === '../utils/helpers') return new Proxy({ isPathExcluded: () => false, isLargeBinarySyncRisk: () => false, getPluginDir: () => 'plugin' }, { get: (t, k) => t[k] ?? (() => undefined) });
  return {};
} });
let cases = 0;
for (const initialized of [false, true]) {
  for (const [restricted, path, skip] of [[false, 'a.zip', true], [true, 'a.PDF', true], [true, 'a.zip', false]]) {
    let slots = 0, completed = 0, sends = 0;
    const plugin = {
      settings: { syncEnabled: true, cloudPreviewEnabled: true, cloudPreviewTypeRestricted: restricted },
      pendingFileDeleteAcks: new Map(),
      localStorageManager: { getMetadata: () => initialized },
      recordSyncCompleted: () => completed++,
      fileDownloadSessions: new Map(),
      totalFilesToDownload: 0,
      websocket: { SendMessage: async () => { sends++; } },
      concurrencyLimiter: { waitForSlot: async () => { slots++; return true; }, releaseSlot() {} },
    };
    await module.exports.receiveFileSyncUpdate({ path, pageIndex: 1 }, plugin);
    assert.equal(slots, skip ? 0 : 1);
    assert.equal(completed, skip ? 1 : 0);
    assert.equal(sends, skip ? 0 : 1);
    cases++;
  }
}
let released = 0, completed = 0, sends = 0;
const plugin = {
  settings: { syncEnabled: true, cloudPreviewEnabled: false, cloudPreviewTypeRestricted: true }, pendingFileDeleteAcks: new Map(),
  recordSyncCompleted: () => completed++,
  fileDownloadSessions: new Map(), totalFilesToDownload: 0,
  websocket: { SendMessage: async () => { sends++; } },
  localStorageManager: { getMetadata: () => false },
  concurrencyLimiter: { waitForSlot: async () => { plugin.settings.cloudPreviewEnabled = true; return true; }, releaseSlot: () => released++ },
};
await module.exports.receiveFileSyncUpdate({ path: 'queued.pdf', pageIndex: 1 }, plugin);
assert.equal(released, 1); assert.equal(completed, 1); assert.equal(sends, 0); cases++;
console.log(`${cases} cloud-preview download cases passed`);
