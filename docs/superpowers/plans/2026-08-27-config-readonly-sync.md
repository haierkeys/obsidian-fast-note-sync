# Config-Only Read-Only Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-device configuration receive-only mode while notes, attachments, and folders remain two-way.

**Architecture:** Add one persisted boolean with a backward-compatible `false` default. A small pure policy module decides whether configuration uploads are allowed and strips local configuration arrays from receive-only sync requests; existing incoming configuration handlers remain active. The settings UI exposes the flag beside configuration sync controls.

**Tech Stack:** TypeScript, Obsidian plugin settings UI, Node.js ESM tests, TypeScript `transpileModule`, npm build, Graphify.

## Global Constraints

- Base feature branch on freshly fetched GitHub `origin/master` commit `1bfb406966d612a61831462bf381bbcd1c73f334`.
- `configReadOnlySyncEnabled` defaults to `false`.
- With `configReadOnlySyncEnabled=true`, config sync sends empty local config, delete, and missing arrays but still receives remote config.
- Notes, attachments, folders, and existing `readonlySyncEnabled` behavior remain unchanged.
- Do not change the server, protocol, credentials, runtime-token handling, secret filtering, or device-local workspace exclusions.
- Use the existing active locales: English, Simplified Chinese, Traditional Chinese, Japanese, and Korean.
- Run `graphify update .` after source changes.

---

### Task 1: Add policy module, setting default, and active locale strings

**Files:**
- Create: `src/lib/sync/config_sync_policy.ts`
- Create: `tests/config-readonly-sync.test.mjs`
- Modify: `src/setting.tsx:20-75,129-165`
- Modify: `src/i18n/locales/en.ts:80-100`
- Modify: `src/i18n/locales/zh-CN.ts:80-100`
- Modify: `src/i18n/locales/zh-TW.ts:80-100`
- Modify: `src/i18n/locales/ja.ts:80-100`
- Modify: `src/i18n/locales/ko.ts:80-100`
- Modify: `src/i18n/locales/en.ts:542-575`
- Modify: `src/i18n/locales/zh-CN.ts:542-575`
- Modify: `src/i18n/locales/zh-TW.ts:542-575`
- Modify: `src/i18n/locales/ja.ts:542-575`
- Modify: `src/i18n/locales/ko.ts:542-575`

**Interfaces:**
- Produces `canUploadConfig(settings)` and `selectConfigSyncUploadItems(readOnly, configs, delConfigs, missingConfigs)` for Tasks 2 and 3.
- Produces persisted `PluginSettings.configReadOnlySyncEnabled` with default `false`.

- [ ] **Step 1: Write the failing policy test**

Create `tests/config-readonly-sync.test.mjs` that transpiles the pure policy module and checks these exact cases:

```js
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
assert.deepEqual(selectConfigSyncUploadItems(true, configs, deletes, missing), {
  configs: [], delConfigs: [], missingConfigs: [],
});
assert.deepEqual(selectConfigSyncUploadItems(false, configs, deletes, missing), {
  configs, delConfigs: deletes, missingConfigs: missing,
});

const settingSource = fs.readFileSync(path.join(root, "src", "setting.tsx"), "utf8");
assert.match(settingSource, /configReadOnlySyncEnabled: boolean/);
assert.match(settingSource, /configReadOnlySyncEnabled: false/);

console.log("config-readonly-sync.test.mjs: policy scenarios passed");
```

- [ ] **Step 2: Run the test to verify the expected red failure**

Run: `node tests/config-readonly-sync.test.mjs`

Expected: `ENOENT` for missing `src/lib/sync/config_sync_policy.ts`. This confirms the new test is not passing against the old code.

- [ ] **Step 3: Add the minimal policy and setting field**

Create `src/lib/sync/config_sync_policy.ts`:

```ts
export interface ConfigSyncUploadSettings {
    configSyncEnabled?: boolean
    readonlySyncEnabled?: boolean
    configReadOnlySyncEnabled?: boolean
}

export const canUploadConfig = (settings: ConfigSyncUploadSettings): boolean =>
    settings.configSyncEnabled !== false &&
    settings.readonlySyncEnabled !== true &&
    settings.configReadOnlySyncEnabled !== true

export const selectConfigSyncUploadItems = <TConfig, TDelete, TMissing>(
    readOnly: boolean,
    configs: TConfig[],
    delConfigs: TDelete[],
    missingConfigs: TMissing[],
): { configs: TConfig[]; delConfigs: TDelete[]; missingConfigs: TMissing[] } =>
    readOnly
        ? { configs: [], delConfigs: [], missingConfigs: [] }
        : { configs, delConfigs, missingConfigs }
```

Add `configReadOnlySyncEnabled: boolean` after `configSyncEnabled` in `PluginSettings`, and add `configReadOnlySyncEnabled: false` after `configSyncEnabled: false` in `DEFAULT_SETTINGS`.

- [ ] **Step 4: Add the five active-locale labels**

Add these keys after `setting.sync.auto_config_desc`, translated in each active locale:

```ts
"setting.sync.config_readonly": "Configuration Receive-Only Mode",
"setting.sync.config_readonly_desc": "This device receives .obsidian configuration but never uploads local configuration. Notes, attachments, and folders remain two-way. Enable this on receiver devices; leave it disabled on the configuration writer.",
```

Use these exact translations in the other active locales:

```ts
// zh-CN.ts
"setting.sync.config_readonly": "配置只读接收模式",
"setting.sync.config_readonly_desc": "本设备只接收服务器配置，不上传本地配置。笔记、附件和文件夹仍保持双向同步。请在接收设备开启，在配置写入设备关闭。",

// zh-TW.ts
"setting.sync.config_readonly": "配置唯讀接收模式",
"setting.sync.config_readonly_desc": "本裝置只接收伺服器配置，不上傳本機配置。筆記、附件和資料夾仍保持雙向同步。請在接收裝置開啟，在配置寫入裝置關閉。",

// ja.ts
"setting.sync.config_readonly": "設定の受信専用モード",
"setting.sync.config_readonly_desc": "この端末はサーバー設定を受信するだけで、ローカル設定をアップロードしません。ノート、添付ファイル、フォルダは引き続き双方向で同期されます。受信端末で有効にし、設定を書き込む端末では無効にしてください。",

// ko.ts
"setting.sync.config_readonly": "구성 수신 전용 모드",
"setting.sync.config_readonly_desc": "이 장치는 서버 구성을 수신만 하고 로컬 구성을 업로드하지 않습니다. 노트, 첨부 파일, 폴더는 계속 양방향으로 동기화됩니다. 수신 장치에서 활성화하고 구성 작성 장치에서는 비활성화하세요.",
```

Add the missing build label after `ui.conflict.diff_too_large` in each active locale:

```ts
"ui.conflict.diff_skipped": "File is too large for line-by-line diff; use the actions above or edit the final version directly",
```

Use these exact localized build labels:

```ts
// zh-CN.ts
"ui.conflict.diff_skipped": "文件较大，已跳过逐行差异对比。可使用上方操作，或直接编辑最终版本",
// zh-TW.ts
"ui.conflict.diff_skipped": "檔案較大，已略過逐行差異比對。可使用上方操作，或直接編輯最終版本",
// ja.ts
"ui.conflict.diff_skipped": "ファイルが大きいため行単位の差分を省略しました。上の操作を使うか、最終版を直接編集してください",
// ko.ts
"ui.conflict.diff_skipped": "파일이 커서 줄 단위 비교를 생략했습니다. 위 작업을 사용하거나 최종 버전을 직접 편집하세요",
```

- [ ] **Step 5: Run the policy test to verify green**

Run: `node tests/config-readonly-sync.test.mjs`

Expected: `config-readonly-sync.test.mjs: policy scenarios passed`.

- [ ] **Step 6: Commit the policy and settings foundation**

```bash
git add src/lib/sync/config_sync_policy.ts src/setting.tsx tests/config-readonly-sync.test.mjs src/i18n/locales
git commit -m "feat(sync): add config receive-only policy"
```

### Task 2: Block local configuration uploads and preserve incoming pulls

**Files:**
- Create: `tests/config-readonly-wiring.test.mjs`
- Modify: `src/lib/sync/operator_config.ts:40-42,132-134,291-298`
- Modify: `src/lib/sync/operator.ts:1-8,1621-1669`

**Interfaces:**
- Consumes `canUploadConfig` and `selectConfigSyncUploadItems` from Task 1.
- Produces guarded local event uploads, a receive-only empty `SettingSync` request, and an acknowledged receive-only `SettingSyncNeedUpload` path.

- [ ] **Step 1: Write the failing wiring test**

Create `tests/config-readonly-wiring.test.mjs`:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const configSource = fs.readFileSync(path.join(root, "src", "lib", "sync", "operator_config.ts"), "utf8");
const operatorSource = fs.readFileSync(path.join(root, "src", "lib", "sync", "operator.ts"), "utf8");

assert.match(configSource, /canUploadConfig\(plugin\.settings\)/);
assert.match(configSource, /configReadOnlySyncEnabled/);
assert.match(operatorSource, /selectConfigSyncUploadItems/);
assert.match(operatorSource, /configUploadItems/);

console.log("config-readonly-wiring.test.mjs: wiring assertions passed");
```

- [ ] **Step 2: Run the wiring test to verify the expected red failure**

Run: `node tests/config-readonly-wiring.test.mjs`

Expected: assertion failure because current config and operator code do not use the new policy.

- [ ] **Step 3: Guard local configuration event uploads**

Import `canUploadConfig` in `operator_config.ts`. Replace the first guard in both `configModify` and `configDelete` with:

```ts
if (!canUploadConfig(plugin.settings)) return
```

Keep all path, exclusion, secret, and hash logic after that guard unchanged. In `receiveConfigUpload`, keep the existing `configSyncEnabled == false` return and change the upload-block condition to:

```ts
if (plugin.settings.readonlySyncEnabled || plugin.settings.configReadOnlySyncEnabled) {
    plugin.recordSyncCompleted('setting', data.pageIndex)
    return
}
```

Do not add the new flag to `receiveConfigSyncModify`, `receiveConfigSyncMtime`, or `receiveConfigSyncDelete`; those handlers must continue applying remote configuration.

- [ ] **Step 4: Strip local configuration from receive-only sync requests**

Import `selectConfigSyncUploadItems` in `operator.ts`. At the start of the `configSyncEnabled && shouldSyncConfigs` block in `handleRequestSend`, add:

```ts
const configUploadItems = selectConfigSyncUploadItems(
  plugin.settings.readonlySyncEnabled === true || plugin.settings.configReadOnlySyncEnabled === true,
  configData.configs,
  plugin.settings.offlineDeleteSyncEnabled ? configData.delConfigs : [],
  configData.missingConfigs,
)
```

Pass `configUploadItems.configs`, `configUploadItems.delConfigs`, and `configUploadItems.missingConfigs` to `sendSyncInBatches`. Keep the batch call even when all three arrays are empty. In its final-batch callback, add pending hashes only from `configUploadItems.configs`. At the end of `handleRequestSend`, set `pendingDeleteConfigPaths` from `configUploadItems.delConfigs`.

- [ ] **Step 5: Run the wiring and policy tests**

Run: `node tests/config-readonly-sync.test.mjs` and `node tests/config-readonly-wiring.test.mjs`

Expected: both print their `... assertions/scenarios passed` messages and exit 0.

- [ ] **Step 6: Commit the sync-flow guards**

```bash
git add src/lib/sync/operator.ts src/lib/sync/operator_config.ts tests/config-readonly-wiring.test.mjs
git commit -m "fix(sync): suppress receiver config uploads"
```

### Task 3: Add the settings toggle and verify the branch

**Files:**
- Modify: `src/setting.tsx:1581-1590`
- Modify: `tests/config-readonly-wiring.test.mjs`

- [ ] **Step 1: Extend the wiring test with the UI contract and verify red**

Append these assertions to `tests/config-readonly-wiring.test.mjs` before its final `console.log`:

```js
const settingSource = fs.readFileSync(path.join(root, "src", "setting.tsx"), "utf8");
assert.match(settingSource, /setting\.sync\.config_readonly/);
assert.match(settingSource, /setDisabled\(!this\.plugin\.settings\.configSyncEnabled\)/);
```

Run: `node tests/config-readonly-wiring.test.mjs`

Expected: assertion failure because the new UI toggle is not present yet.

- [ ] **Step 2: Add the UI toggle**

Insert immediately after the existing configuration sync toggle and description in `renderSyncSettings`:

```ts
new Setting(set)
  .setName($("setting.sync.config_readonly"))
  .setClass("fns-setting-item-checkbox")
  .addToggle((toggle) => toggle
    .setValue(this.plugin.settings.configReadOnlySyncEnabled === true)
    .setDisabled(!this.plugin.settings.configSyncEnabled)
    .onChange(async (value) => {
      if (value === this.plugin.settings.configReadOnlySyncEnabled) return
      this.plugin.settings.configReadOnlySyncEnabled = value
      await this.plugin.saveAndReloadServices()
    }))
this.setDescWithBreaks(set.lastElementChild as HTMLElement, $("setting.sync.config_readonly_desc"))
```

- [ ] **Step 3: Run focused tests and build**

Run:

```bash
node tests/config-readonly-sync.test.mjs
node tests/config-readonly-wiring.test.mjs
npm run build
git diff --check
```

Expected: both focused tests pass, TypeScript and production bundling exit 0, and `git diff --check` prints no errors.

- [ ] **Step 4: Update Graphify**

Run: `graphify update .`

Expected: Graphify updates the local graph without changing tracked source files.

- [ ] **Step 5: Review the final diff and commit the UI**

Run: `git status --short --branch` and `git diff --stat origin/master...HEAD`.

Confirm only the spec, plan, policy, setting, locale, operator, and focused test files changed. Then commit:

```bash
git add src/setting.tsx
git commit -m "feat(sync): expose config receive-only mode"
```

- [ ] **Step 6: Run final verification before any push or PR**

Run:

```bash
node tests/config-readonly-sync.test.mjs
node tests/config-readonly-wiring.test.mjs
npm run build
git diff --check
git status --short --branch
git log --oneline --decorate -6
```

Expected: focused tests pass, build exits 0, diff check is clean, and only expected generated Graphify output is untracked if present.
