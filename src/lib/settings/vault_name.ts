import { debounce } from "../utils/helpers";

interface VaultNameSettingsOwner {
  settings: { vault: string }
  wsSettingChange: boolean
  localStorageManager: { clearSyncTime(): void }
  saveAndReloadServices(): Promise<void>
}

export function createVaultNameChangeHandler(plugin: VaultNameSettingsOwner, wait = 500): (value: string) => void {
  let pendingValue = plugin.settings.vault
  const applyPendingValue = debounce(async () => {
    const value = pendingValue
    if (value === plugin.settings.vault) return

    plugin.wsSettingChange = true
    plugin.settings.vault = value
    plugin.localStorageManager.clearSyncTime()
    await plugin.saveAndReloadServices()
  }, wait)

  return (value: string) => {
    pendingValue = value
    applyPendingValue()
  }
}
