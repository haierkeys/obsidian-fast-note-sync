import { useState, useEffect, useRef } from "react";
import { KofiImage, WXImage } from "src/lib/icons";
import { dump } from "src/lib/helps";
import { setIcon } from "obsidian";
import FastSync from "src/main";

import { $ } from "../lang/lang";


async function getClipboardContent(plugin: FastSync): Promise<void> {
  const clipboardReadTipSave = async (api: string, apiToken: string, Vault: string, tip: string) => {
    if (plugin.settings.api != api || plugin.settings.apiToken != apiToken) {
      plugin.wsSettingChange = true
    }
    plugin.settings.api = api
    plugin.settings.apiToken = apiToken
    plugin.settings.vault = Vault
    plugin.clipboardReadTip = tip

    await plugin.saveSettings()
    plugin.settingTab.display()

    setTimeout(() => {
      plugin.clipboardReadTip = ""
      plugin.settingTab.display()
    }, 2000)
  }

  //
  const clipboardReadTipTipSave = async (tip: string) => {
    plugin.clipboardReadTip = tip

    await plugin.saveData(plugin.settings)
    plugin.settingTab.display()

    setTimeout(() => {
      plugin.clipboardReadTip = ""
      plugin.settingTab.display()
    }, 2000)
  }

  try {
    // 检查浏览器是否支持 Clipboard API
    if (!navigator.clipboard) {
      return
    }

    // 获取剪贴板文本内容
    const text = await navigator.clipboard.readText()

    // 检查是否为 JSON 格式
    let parsedData = JSON.parse(text)

    // 检查是否为对象且包含 api 和 apiToken
    if (typeof parsedData === "object" && parsedData !== null) {
      const hasApi = "api" in parsedData
      const hasApiToken = "apiToken" in parsedData
      const vault = "vault" in parsedData

      if (hasApi && hasApiToken && vault) {
        void clipboardReadTipSave(parsedData.api, parsedData.apiToken, parsedData.vault, $("setting.remote.paste_success"))
        return
      }
    }
    void clipboardReadTipTipSave($("setting.remote.no_config"))
    return
  } catch (err) {
    dump(err)
    void clipboardReadTipTipSave($("setting.remote.no_config"))
    return
  }
}

const handleClipboardClick = (plugin: FastSync) => {
  getClipboardContent(plugin).catch(err => { dump(err); });
};

export const SettingsView = ({ plugin }: { plugin: FastSync }) => {
  const [isConnected, setIsConnected] = useState<boolean>(plugin.websocket.isConnected());
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const listener = (status: boolean) => {
      setIsConnected(status);
    };

    plugin.websocket.addStatusListener(listener);
    return () => {
      plugin.websocket.removeStatusListener(listener);
    };
  }, [plugin.websocket]);

  useEffect(() => {
    if (iconRef.current) {
      iconRef.current.empty();
      setIcon(iconRef.current, isConnected ? "wifi" : "wifi-off");
    }
  }, [isConnected]);

  // 简单的 Markdown 表格渲染函数
  const renderMarkdownTable = (content: string) => {
    const lines = content.split('\n');
    const tableData = lines.filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
    if (tableData.length < 2) return null;

    const parseRow = (row: string) => row.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(s => s.trim());
    const headerRow = parseRow(tableData[0]);
    const bodyRows = tableData.slice(2).map(parseRow);

    return (
      <table className="fast-note-sync-settings-openapi">
        <thead>
          <tr>
            {headerRow.map((h, i) => <th key={i}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => {
                return <td key={j} dangerouslySetInnerHTML={{ __html: cell }} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <>
      <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <div className="setting-item-info">
          <div className="setting-item-name">{$("setting.remote.setup_title")}</div>
          <div className="setting-item-description">{$("setting.remote.setup_desc")}</div>
        </div>
        <div style={{ width: '100%', marginTop: '0px' }}>
          {renderMarkdownTable($("setting.remote.setup_table"))}
          <div className="clipboard-read">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="clipboard-read-button" onClick={() => handleClipboardClick(plugin)}>
                {$("setting.remote.paste_config")}
              </button>
              <div className="connection-status-container" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <span
                  ref={iconRef}
                  className="connection-status-icon"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: isConnected ? '#4caf50' : '#f44336'
                  }}
                />
                <span style={{ color: 'var(--text-muted)' }}>
                  {isConnected ? $("setting.remote.connected") : $("setting.remote.disconnected")}
                </span>
              </div>
            </div>
            <div className="clipboard-read-description">{plugin.clipboardReadTip}</div>
          </div>
        </div>
      </div>

    </>
  )
}



export const SupportView = ({ plugin }: { plugin: FastSync }) => {
  return (
    <div className="setting-item">
      <div className="setting-item-info">
        <div className="setting-item-description">
          {$("setting.support.desc")}
          <table className="fast-note-sync-support-table">
            <thead>
              <tr>
                <th>{$("setting.support.kofi")}</th>
                <th style={{ width: '40px' }}></th>
                <th>{$("setting.support.wechat")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <a href="https://ko-fi.com/haierkeys" target="_blank" rel="noreferrer">
                    <img src={KofiImage} className="ko-fi-logo-large" alt="Ko-fi" />
                  </a>
                </td>
                <td className="support-separator">{$("setting.support.or")}</td>
                <td>
                  <img src={WXImage} className="wx-pay-logo-large" alt="WeChat Pay" />
                </td>
              </tr>
            </tbody>
          </table>

          <div className="supporters-list-section">
            <div className="supporters-list-title">
              {$("setting.support.list")}
            </div>
            <div className="supporters-list-subtitle"></div>
            <div className="supporters-list-content">
              <a href="https://github.com/haierkeys/fast-note-sync-service/blob/master/docs/Support.zh-CN.md" target="_blank" rel="noreferrer">
                https://github.com/haierkeys/fast-note-sync-service/blob/master/docs/Support.zh-CN.md
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
