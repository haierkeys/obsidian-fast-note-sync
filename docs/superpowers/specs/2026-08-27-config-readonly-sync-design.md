# Config-Only Read-Only Sync

## Problem

FNS currently has one global `readonlySyncEnabled` switch. It stops local uploads for notes, attachments, folders, and configuration together. `manualSyncEnabled` also pauses automatic note uploads, so neither setting provides this policy:

- notes, attachments, and folders remain two-way;
- one writer device uploads `.obsidian` configuration;
- other devices receive `.obsidian` configuration but never upload local configuration.

The existing configuration upload request can also advertise a receiver's newer local configuration. A guard that only ignores `SettingSyncNeedUpload` is insufficient because the server may then avoid sending the writer's configuration.

## Goals

1. Add `configReadOnlySyncEnabled` to plugin settings.
2. Default it to `false`, preserving existing behavior for upgraded installations.
3. When `configSyncEnabled=true` and `configReadOnlySyncEnabled=true`, receive configuration updates without sending local configuration content, mtime changes, deletions, or missing-file claims.
4. Keep note, attachment, and folder synchronization unchanged unless existing `readonlySyncEnabled` is enabled.
5. Keep existing `readonlySyncEnabled` semantics unchanged: it remains a global local-upload block.
6. Expose the new option in the sync settings UI with clear receiver-device guidance.
7. Add regression tests for outgoing config suppression and incoming config processing.

## Non-goals

- No server or protocol change. The client already supports a configuration sync request with an empty local list and can receive the normal server response.
- No automatic writer-device election. Every device with `configReadOnlySyncEnabled=false` can still upload configuration; users choose the writer by enabling the flag on receiver devices.
- No change to note, attachment, folder, manual-sync, or global read-only behavior.
- No change to excluded local workspace layouts, credentials, runtime tokens, or secret-bearing configuration handling.

## Design

### Setting and UI

Add this boolean to `PluginSettings` and `DEFAULT_SETTINGS`:

```ts
configReadOnlySyncEnabled: boolean
```

The default is `false`. Render the toggle beside configuration sync controls when configuration sync is enabled. The description must state:

- this device receives configuration from the server;
- this device does not upload local configuration;
- notes, attachments, and folders are unaffected;
- enable it on receiver devices and leave it disabled on the configuration writer.

Add strings for all active locales: English, Simplified Chinese, Traditional Chinese, Japanese, and Korean. Missing translations fall back to English through the existing locale mechanism.

### Outgoing configuration flow

Use `configReadOnlySyncEnabled` as a configuration-only upload gate:

- `configModify` returns before creating a `SettingModify` upload.
- `configDelete` returns before creating a `SettingDelete` upload.
- `handleRequestSend` still starts the configuration sync request so the server can send remote changes, but sends empty `settings`, `delSettings`, and `missingSettings` arrays for a read-only configuration device.
- The empty request must still use one batch, allowing normal `SettingSyncEnd` and downstream page handling.
- Existing `readonlySyncEnabled` checks remain in place and continue to control all upload types.

The receiver may still scan local configuration for existing hash/state bookkeeping. Those local entries must never be placed in the outgoing configuration request while `configReadOnlySyncEnabled` is true.

### Incoming configuration flow

Keep `SettingSyncModify`, `SettingSyncMtime`, and `SettingSyncDelete` processing enabled when configuration sync is enabled. If an already queued `SettingSyncNeedUpload` arrives, acknowledge it as completed without reading or uploading the local file. This prevents stalled sync progress and protects the receive-only policy.

When the receiver's local configuration differs from the server, the empty outgoing list prevents the receiver from advertising that local state as a competing writer. The server's normal configuration response can therefore deliver the writer's current content.

### Baseline build repair

Fresh `origin/master` currently fails TypeScript compilation because `conflict-resolve-modal.ts` references `ui.conflict.diff_skipped`, which is absent from the active locale maps. If this remains true when implementation starts, add that one fallback label to the five active locale files. This is a build-only correction with no relation to sync policy.

## Verification

The implementation is accepted only when all of these are demonstrated:

1. A default settings test confirms `configReadOnlySyncEnabled` is false.
2. A source-level or focused behavior test confirms local configuration modify/delete paths do not send while the flag is true.
3. A focused request test confirms a read-only configuration sync sends one empty configuration batch and still permits remote response handling.
4. A focused upload-request test confirms `SettingSyncNeedUpload` is acknowledged without a local upload.
5. A focused incoming test confirms remote modify, mtime, and delete paths still run with the flag true.
6. Existing note/file/folder guards remain unchanged.
7. `npm run build` passes from the feature branch.
8. Relevant existing tests pass, `git diff --check` passes, and Graphify is updated after code changes.

## Contribution boundary

The feature branch starts at the freshly fetched GitHub `origin/master` commit. Existing local repair commits remain in their original checkout and are not bundled into this PR. The contribution is prepared for GitHub; CNB is treated as a downstream mirror unless its maintainers provide a separate authenticated contribution path.
