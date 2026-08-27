import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const policyPath = path.join(root, "src", "lib", "sync", "config_sync_policy.ts");
const source = fs.readFileSync(policyPath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: policyPath,
}).outputText;
const module = { exports: {} };
vm.runInNewContext(transpiled, { module, exports: module.exports }, { filename: policyPath });

const { canUploadConfig, selectConfigSyncUploadItems } = module.exports;
assert.equal(canUploadConfig({ configSyncEnabled: false }), false);
assert.equal(canUploadConfig({ configSyncEnabled: true, readonlySyncEnabled: false, configReadOnlySyncEnabled: false }), true);
assert.equal(canUploadConfig({ configSyncEnabled: true, readonlySyncEnabled: false, configReadOnlySyncEnabled: true }), false);
assert.equal(canUploadConfig({ configSyncEnabled: true, readonlySyncEnabled: true, configReadOnlySyncEnabled: false }), false);

const configs = [{ path: ".obsidian/app.json" }];
const deletes = [{ path: ".obsidian/old.json" }];
const missing = [{ path: ".obsidian/missing.json" }];
assert.equal(JSON.stringify(selectConfigSyncUploadItems(true, configs, deletes, missing)), JSON.stringify({
  configs: [], delConfigs: [], missingConfigs: [],
}));
assert.equal(JSON.stringify(selectConfigSyncUploadItems(false, configs, deletes, missing)), JSON.stringify({
  configs, delConfigs: deletes, missingConfigs: missing,
}));

const settingSource = fs.readFileSync(path.join(root, "src", "setting.tsx"), "utf8");
assert.match(settingSource, /configReadOnlySyncEnabled: boolean/);
assert.match(settingSource, /configReadOnlySyncEnabled: false/);

console.log("config-readonly-sync.test.mjs: policy scenarios passed");
