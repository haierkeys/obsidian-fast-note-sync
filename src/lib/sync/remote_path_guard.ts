import { TFolder, normalizePath, type TAbstractFile, type Vault } from "obsidian";
import type FastSync from "../../main";
import { SyncLogManager } from "./sync_log_manager";

// getRealPath is a desktop adapter capability, not part of the portable API.
type PathAwareAdapter = Vault["adapter"] & { getRealPath?: (path: string) => string };

/**
 * Check identities before a destructive operation.
 *
 * Paths are compared in Obsidian's canonical form (normalizePath: separators, NFC, no-break
 * spaces). Comparing the raw server path with the already-normalized vault path blocked every
 * remote delete/rename of NFD or no-break-space names (common on iOS), leaving deleted files on
 * the device to be uploaded again. Only a physical path that resolves to a different canonical
 * path (symlink, case alias) is treated as an alias.
 */
export function blockAliasedRemoteMutation(
  plugin: FastSync,
  file: TAbstractFile | null,
  requestedPath: string,
  action: string,
): boolean {
  if (!file) return false;
  const adapter = plugin.app.vault.adapter as PathAwareAdapter;
  const canonical = (path: string) => normalizePath(path.replace(/\\/g, "/"));
  const pending = [file];
  const visited = new Set<TAbstractFile>();
  while (pending.length) {
    const current = pending.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const expected = current === file ? requestedPath : current.path;
    const physical = adapter.getRealPath?.(current.path) ?? current.path;
    if (canonical(current.path) !== canonical(expected) || canonical(physical) !== canonical(expected)) {
      SyncLogManager.getInstance().addLog(
        "receive", `${action}PathAliasBlocked`,
        "Remote mutation blocked: requested path resolves to a different local path. Reconcile the paths before retrying.",
        "error", requestedPath,
      );
      return true;
    }
    // A folder overwrite can recursively delete an aliased descendant.
    if (current instanceof TFolder) pending.push(...current.children);
  }
  return false;
}
