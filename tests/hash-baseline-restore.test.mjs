import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

// Acknowledged baselines must survive a restart after mobile localStorage eviction.

const root = path.resolve(import.meta.dirname, "..");

function transpile(relPath) {
  const sourcePath = path.join(root, relPath);
  const source = fs.readFileSync(sourcePath, "utf8");
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText;
}

function loadModule(relPath, requireStub, extraGlobals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(transpile(relPath), {
    require: requireStub,
    module,
    exports: module.exports,
    console,
    window: { setTimeout, clearTimeout },
    setTimeout,
    clearTimeout,
    ...extraGlobals,
  });
  return module.exports;
}

// --- 载入 helpers.ts（提供 LocalStateFileMirror / debounce 等） ---
const helpersRequireStub = (id) => {
  switch (id) {
    case "obsidian":
      return {
        Notice: class { setMessage() {} hide() {} },
        normalizePath: (p) => p,
        TFolder: class {},
        Platform: { isMobile: false },
        App: class {},
      };
    case "../../i18n/lang":
      return { $: (key) => key };
    case "../../main":
      return {};
    case "../sync/sync_log_manager":
      return { SyncLogManager: { getInstance: () => ({ addOrUpdateLog: () => undefined }) } };
    case "../helpers_obsidian_bypass":
      return {
        nativeFetch: () => undefined,
        vaultDelete: () => undefined,
        dump: () => undefined,
        dumpError: () => undefined,
        setLogEnabled: () => undefined,
        logLevel: () => undefined,
      };
    default:
      throw new Error(`Unexpected require in helpers: ${id}`);
  }
};
const helpers = loadModule("src/lib/utils/helpers.ts", helpersRequireStub, {
  activeDocument: undefined,
  crypto: { getRandomValues: (a) => a },
});

// --- 载入 file_hash_manager.ts ---
const fhmRequireStub = (id) => {
  switch (id) {
    case "../utils/helpers":
      return helpers;
    case "../../main":
      return {};
    default:
      throw new Error(`Unexpected require in file_hash_manager: ${id}`);
  }
};
const { FileHashManager } = loadModule("src/lib/storage/file_hash_manager.ts", fhmRequireStub);

// --- 假 plugin：localStorage 用 Map，vault.adapter 用 Map（内存文件系统） ---
function makeFakePlugin(localStorageMap, fileMap, { onGetFiles } = {}) {
  return {
    manifest: { id: "fast-note-sync", dir: ".obsidian/plugins/fast-note-sync" },
    settings: {},
    app: {
      loadLocalStorage: (key) => (localStorageMap.has(key) ? localStorageMap.get(key) : null),
      saveLocalStorage: (key, value) => {
        if (value === null || value === undefined) localStorageMap.delete(key);
        else localStorageMap.set(key, String(value));
      },
      vault: {
        configDir: ".obsidian",
        getName: () => "TestVault",
        getFiles: () => {
          if (onGetFiles) onGetFiles();
          return [];
        },
        adapter: {
          exists: async (p) => fileMap.has(p),
          read: async (p) => {
            if (!fileMap.has(p)) throw new Error("ENOENT: " + p);
            return fileMap.get(p);
          },
          write: async (p, data) => {
            fileMap.set(p, data);
          },
        },
      },
    },
  };
}

const MIRROR_PATH = ".obsidian/plugins/fast-note-sync/fileHashMap.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SYNC_MIRROR = ".obsidian/plugins/fast-note-sync/syncHashMap.json";

// Scenario 1: localStorage evicted; restoring the cache must not overwrite the baseline mirror.
{
  const ls = new Map(), files = new Map();
  const first = new FileHashManager(makeFakePlugin(ls, files));
  await first.initialize();
  first.setFileHash("img/a.png", "ack-a", 111, 10);
  first.flush();
  await sleep(20);
  assert.equal(JSON.parse(files.get(SYNC_MIRROR))["img/a.png"], "ack-a");

  ls.clear(); // iOS evicts webview storage
  const second = new FileHashManager(makeFakePlugin(ls, files));
  await second.initialize();
  second.flush();
  await sleep(20);
  assert.equal(second.getPathHash("img/a.png"), "ack-a", "acknowledged baseline restored from mirror");
  assert.equal(JSON.parse(files.get(SYNC_MIRROR))["img/a.png"], "ack-a", "mirror not overwritten with an empty map");
  assert.equal(JSON.parse(ls.get("fns-syncHashMap"))["img/a.png"], "ack-a", "localStorage re-seeded from mirror");
}

// Scenario 2: a parseable but empty localStorage baseline must not win over a populated mirror.
{
  const ls = new Map(), files = new Map();
  files.set(SYNC_MIRROR, JSON.stringify({ "img/b.png": "ack-b" }));
  ls.set("fns-fileHashMap", JSON.stringify({ "img/b.png": { hash: "ack-b", mtime: 1, size: 1 } }));
  ls.set("fns-syncHashMap", "{}");
  const mgr = new FileHashManager(makeFakePlugin(ls, files));
  await mgr.initialize();
  assert.equal(mgr.getPathHash("img/b.png"), "ack-b");
}

console.log("hash-baseline-restore.test.mjs: all scenarios passed");
