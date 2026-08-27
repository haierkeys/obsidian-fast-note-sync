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
