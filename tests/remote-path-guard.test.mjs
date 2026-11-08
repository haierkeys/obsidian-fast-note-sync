import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
class TFile { constructor(path) { this.path = path; this.stat = { size: 1, mtime: 1 }; } }
class TFolder { constructor(path) { this.path = path; this.children = []; } }
// Model Obsidian's space folding and NFC conversion before a vault lookup.
const normalizePath = p => p.replace(/\\/g, "/").replace(/\u00a0|\u202f/g, " ").normalize("NFC");
let logs = [], empty = true, onWait = () => {};
const logger = { getInstance: () => ({ addLog: (...args) => logs.push(args) }) };
const helpers = new Proxy({
  isPathExcluded: () => false,
  isFolderSyncPathExcluded: () => false,
  vaultDelete: (vault, file) => vault.trash(file),
  waitForFolderEmpty: async () => { onWait(); return empty; },
}, { get: (target, name) => target[name] ?? (() => undefined) });
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const source = fs.readFileSync(path.join(root, `src/lib/sync/${name}.ts`), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, console,
    window: { setTimeout: callback => callback() },
    require(id) {
      if (id === "obsidian") return { TFile, TFolder, normalizePath, Platform: { isMobile: false } };
      if (id === "./remote_path_guard") return load("remote_path_guard");
      if (id === "./sync_log_manager") return { SyncLogManager: logger };
      if (id === "../utils/helpers") return helpers;
      if (id === "../storage/file_cloud_preview") return { FileCloudPreview: { isRestrictedType: () => false } };
      if (id === "../api/http_api_service") return { HttpApiService: {} };
      throw new Error(`Unexpected import: ${id}`);
    },
  }, { filename: name });
  cache.set(name, module.exports);
  return module.exports;
}

let cases = 0;
async function check(kind, operation, mode, alias = "notes/A\u00a0B.md") {
  logs = []; empty = mode !== "nonempty";
  const normal = normalizePath(alias), source = "notes/source.md";
  const rawTarget = mode === "rawTarget" || (operation === "Delete" && ["raw", "portableRaw"].includes(mode)) ? alias : normal;
  const rawSource = mode === "rawSource" ? alias : mode === "samePath" ? normal : source;
  const sourcePath = operation === "Delete" ? normalizePath(rawTarget) : normalizePath(rawSource);
  const Ctor = kind === "folder" ? TFolder : TFile;
  const file = new Ctor(sourcePath), target = new Ctor(normalizePath(rawTarget));
  const files = new Map([[sourcePath, file]]), physical = new Map();
  if (operation === "Rename" && mode !== "absentTarget") files.set(normalizePath(rawTarget), target);
  if (mode === "physical") physical.set(sourcePath, alias);
  if (mode === "physicalSource") physical.set(sourcePath, alias);
  if (mode === "physicalTarget") physical.set(target.path, alias);
  if (mode === "windows") physical.set(sourcePath, sourcePath.replaceAll("/", "\\"));
  if (mode === "nested" || mode === "foreignNested") {
    const parent = operation === "Rename" ? target : file;
    const child = new TFile(parent.path + "/A B.md");
    parent.children.push(child);
    physical.set(child.path, mode === "nested" ? parent.path + "/A\u00a0B.md" : "elsewhere/A B.md");
  }
  if (mode === "foreign" || mode === "foreignSource") physical.set(sourcePath, "elsewhere/real.md");
  if (mode === "foreignTarget") physical.set(target.path, "elsewhere/real.md");
  if (mode === "nonempty") file.children.push(new TFile(sourcePath + "/child.md"));
  const adapter = { getRealPath: p => physical.get(p) ?? p };
  if (["portable", "portableRaw"].includes(mode)) delete adapter.getRealPath;
  onWait = mode === "lateAlias" ? () => physical.set(sourcePath, alias)
    : mode === "foreignLate" ? () => physical.set(sourcePath, "elsewhere/real.md") : () => {};
  const deleted = [], renamed = [], removedHashes = [], ignored = [], completed = [];
  const pending = new Map([[sourcePath, "unsent edit"]]);
  const plugin = {
    settings: { syncEnabled: true, cloudPreviewEnabled: false },
    app: { vault: {
      adapter, getFileByPath: p => files.get(p), getAbstractFileByPath: p => files.get(p),
      trash: async f => deleted.push(f.path),
      rename: async (f, p) => { renamed.push(p); files.delete(f.path); f.path = p; files.set(p, f); },
    } },
    lockManager: { withLock: async (_, callback) => callback() },
    addIgnoredFile: p => ignored.push(p), removeIgnoredFile() {},
    lastSyncPathDeleted: new Set(), lastSyncPathRenamed: new Set(), lastSyncMtime: new Map(),
    pendingNoteModifies: pending, fileDownloadSessions: new Map(),
    fileHashManager: { removeFileHash: p => removedHashes.push(p), setFileHash() {} },
    folderSnapshotManager: { removeFolder() {}, setFolderMtime() {} },
    localStorageManager: { getMetadata: () => 0, setMetadata() {}, savePending() {} },
    noteSyncTasks: { failed: 0 }, fileSyncTasks: { failed: 0 }, folderSyncTasks: { failed: 0 },
    recordSyncCompleted: (...args) => completed.push(args),
  };
  const handler = load(`operator_${kind}`)[`receive${kind[0].toUpperCase() + kind.slice(1)}Sync${operation}`];
  await handler({ path: rawTarget, oldPath: rawSource, pageIndex: 7, contentHash: "1" }, plugin);
  // Unicode/no-break-space spellings of the same canonical path are the same file; only a
  // physical path that resolves elsewhere is an alias.
  const blocked = ["physicalSource", "foreign", "foreignSource", "foreignTarget", "foreignNested", "foreignLate"].includes(mode);
  const skipped = blocked || mode === "nonempty";
  const label = JSON.stringify({ kind, operation, mode, alias });
  // A raw source that canonicalizes to the target is the same file: rename in place, nothing replaced.
  assert.equal(deleted.length, skipped || ["absentTarget", "samePath", "rawSource"].includes(mode) ? 0 : 1, label);
  assert.equal(renamed.length, operation === "Rename" && !skipped ? 1 : 0, label);
  assert.equal(completed.length, 1, label);
  assert.equal(plugin.noteSyncTasks.failed + plugin.fileSyncTasks.failed + plugin.folderSyncTasks.failed, 0, label);
  if (blocked) {
    assert(logs.some(log => log[1].endsWith("PathAliasBlocked")), label);
    assert.equal(removedHashes.length, 0, label);
    assert.equal(ignored.length, mode === "foreignLate" ? 1 : 0, label);
    assert(pending.has(sourcePath), label);
  }
  cases++;
}

for (const kind of ["note", "file", "folder"]) {
  for (const alias of ["notes/A\u00a0B.md", "notes/A\u202fB.md", "notes/カ\u3099.md"]) {
    await check(kind, "Delete", "raw", alias);
    await check(kind, "Delete", "portableRaw", alias);
    await check(kind, "Delete", "physical", alias);
    await check(kind, "Rename", "rawSource", alias);
    await check(kind, "Rename", "physicalSource", alias);
    await check(kind, "Rename", "rawTarget", alias);
    await check(kind, "Rename", "physicalTarget", alias);
  }
  for (const mode of ["normal", "windows", "portable", "foreign"]) await check(kind, "Delete", mode);
  await check(kind, "Rename", "foreignSource");
  await check(kind, "Rename", "foreignTarget");
  await check(kind, "Rename", "normal");
  await check(kind, "Rename", "absentTarget");
  await check(kind, "Rename", "samePath");
}
await check("folder", "Delete", "nested");
await check("folder", "Rename", "nested");
await check("folder", "Delete", "nonempty");
await check("folder", "Delete", "lateAlias");
await check("folder", "Delete", "foreignNested");
await check("folder", "Rename", "foreignNested");
await check("folder", "Delete", "foreignLate");
console.log(`Remote path guard: ${cases} handler cases passed`);
