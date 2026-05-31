import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "src", "lib", "websocket.ts");
const source = fs.readFileSync(sourcePath, "utf8");

const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
  fileName: sourcePath,
}).outputText;

const module = { exports: {} };
const requireStub = (id) => {
  switch (id) {
    case "obsidian":
      return { moment: Object.assign(() => ({ format: () => "" }), { locale: () => "zh-cn" }), Platform: {} };
    case "./helps":
      return {
        dump: () => undefined,
        isWsUrl: () => true,
        addRandomParam: (value) => value,
        isPathExcluded: () => false,
        isVersionNew: () => false,
        showSyncNotice: () => undefined,
      };
    case "./file_operator":
      return {
        handleFileChunkDownload: () => undefined,
        BINARY_PREFIX_FILE_SYNC: "fs",
        clearUploadQueue: () => undefined,
      };
    case "./operator":
      return {
        receiveOperators: {},
        startupSync: () => undefined,
        startupFullSync: () => undefined,
        checkSyncCompletion: () => undefined,
      };
    case "./sync_log_manager":
      return { SyncLogManager: { getInstance: () => ({ logReceivedMessage: () => undefined, logSentMessage: () => undefined }) } };
    case "../i18n/lang":
      return { $: (key) => key };
    default:
      throw new Error(`Unexpected require: ${id}`);
  }
};

vm.runInNewContext(transpiled, {
  require: requireStub,
  module,
  exports: module.exports,
  console,
  TextDecoder,
  setTimeout,
  clearTimeout,
}, { filename: sourcePath });

const { formatAuthorizationError } = module.exports;

assert.equal(typeof formatAuthorizationError, "function");

const missingMessage = formatAuthorizationError({ code: 308 });
assert.match(missingMessage, /Code=308/);
assert.match(missingMessage, /Session expired or token has been revoked/);
assert.match(missingMessage, /Please re-import the API configuration/);
assert.doesNotMatch(missingMessage, /undefined/);

const rotated = formatAuthorizationError({ code: 308, details: ["Token has been rotated"] });
assert.match(rotated, /Details=Token has been rotated/);
assert.match(rotated, /Please re-import the API configuration/);

const scopeRestricted = formatAuthorizationError({ code: 315, message: undefined, details: "Permission denied: Handshake" });
assert.match(scopeRestricted, /Authorization token scope is restricted/);
assert.match(scopeRestricted, /Details=Permission denied: Handshake/);
assert.doesNotMatch(scopeRestricted, /Please re-import/);
assert.doesNotMatch(scopeRestricted, /undefined/);
