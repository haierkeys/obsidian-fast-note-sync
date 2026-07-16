import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "src", "lib", "settings", "vault_name.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const module = { exports: {} };
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

vm.runInNewContext(
  transpiled,
  {
    module,
    exports: module.exports,
    require: (id) => {
      if (id === "../utils/helpers") return { debounce };
      throw new Error(`Unexpected import: ${id}`);
    },
  },
  { filename: sourcePath },
);

const { createVaultNameChangeHandler } = module.exports;
assert.equal(typeof createVaultNameChangeHandler, "function");

let clearCount = 0;
let saveCount = 0;
const plugin = {
  settings: { vault: "Original" },
  wsSettingChange: false,
  localStorageManager: {
    clearSyncTime() {
      clearCount += 1;
    },
  },
  async saveAndReloadServices() {
    saveCount += 1;
  },
};

const handleVaultNameChange = createVaultNameChangeHandler(plugin, 20);
handleVaultNameChange("N");
handleVaultNameChange("Ne");
handleVaultNameChange("New Vault");

assert.equal(plugin.settings.vault, "Original");
assert.equal(clearCount, 0);
assert.equal(saveCount, 0);

await new Promise((resolve) => setTimeout(resolve, 40));

assert.equal(plugin.settings.vault, "New Vault");
assert.equal(plugin.wsSettingChange, true);
assert.equal(clearCount, 1);
assert.equal(saveCount, 1);

handleVaultNameChange("New Vault");
await new Promise((resolve) => setTimeout(resolve, 40));

assert.equal(clearCount, 1);
assert.equal(saveCount, 1);