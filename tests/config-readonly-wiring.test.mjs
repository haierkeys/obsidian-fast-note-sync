import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const configSource = fs.readFileSync(
  path.join(root, "src", "lib", "sync", "operator_config.ts"),
  "utf8",
);
const operatorSource = fs.readFileSync(
  path.join(root, "src", "lib", "sync", "operator.ts"),
  "utf8",
);

assert.match(configSource, /canUploadConfig\(plugin\.settings\)/);
assert.match(configSource, /configReadOnlySyncEnabled/);
assert.match(operatorSource, /selectConfigSyncUploadItems/);
assert.match(operatorSource, /configUploadItems/);

const settingSource = fs.readFileSync(path.join(root, "src", "setting.tsx"), "utf8");
assert.match(settingSource, /setting\.sync\.config_readonly/);
assert.match(settingSource, /setDisabled\(!this\.plugin\.settings\.configSyncEnabled\)/);

console.log("config-readonly-wiring.test.mjs: source wiring present");
