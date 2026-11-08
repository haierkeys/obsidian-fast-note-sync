# Remote path identity checks

Obsidian exposes a normalized `TFile.path`: `normalizePath()` unifies separators,
converts no-break spaces to ASCII spaces and applies NFC. The desktop adapter's
`getRealPath()` can still return the on-disk spelling, for example an NFD name.
A remote tombstone or rename is looked up through `normalizePath()`, so it can
resolve to a local object whose physical path is elsewhere (a symlink or a case
alias).

Before a remote note, attachment or folder delete/rename, compare the message
path, the resolved object's path and, where available, the `getRealPath()`
result, all in canonical form (`normalizePath()`). Different spellings of the
same canonical path are the same file and are not blocked; this matters because
files created on iOS commonly have NFD names. A physical path that canonicalizes
to a different path is blocked. Case differences are not folded. Rename checks
cover both the source and an existing overwrite target. Folder checks include
descendants because an overwrite can recursively delete them. A folder delete
rechecks after waiting for the folder to become empty. A same-object rename does
not delete its source.

An earlier revision compared raw strings and folded only separators. It blocked
every remote delete or rename of an NFD or no-break-space name, leaving those
files on the device to be uploaded again by the next reconciliation.

A mismatch logs `*PathAliasBlocked` and skips the mutation before changing
ignored-event state, hashes or pending note modifications. Existing page/task
completion still runs. Reconcile the local and server path identities before
retrying; this guard does not automatically restore server tombstones, rename
local files, or merge content conflicts.

The optional desktop capability is feature-detected. Without `getRealPath()`,
only the message path and logical path are compared, so hidden physical aliases
cannot be detected. The tests model both adapter shapes; they do not constitute
an on-device iOS/iPadOS test.

Run `npm run test:path-guard`. The tests transpile and execute the six source
handlers with isolated vault/adapter dependencies. Synthetic cases cover NBSP,
narrow non-breaking spaces and NFD spellings (accepted), physical paths that
resolve elsewhere, including descendants and changes during the folder wait
(blocked), rename overwrite targets, normal mutations, Windows separators,
adapters without `getRealPath`, nonempty folders and same-path renames. Blocked
operations must preserve pending edits and hashes and still complete their page
once.
