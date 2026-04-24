import { useState, useEffect, useRef } from "react";
import { KofiImage, WXImage } from "src/lib/icons";
import { dump } from "src/lib/helps";
import { setIcon } from "obsidian";
import FastSync from "src/main";

import { UserDTO } from "../lib/api";
import { $ } from "../i18n/lang";


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
  const [userInfo, setUserInfo] = useState<UserDTO | null>(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState<boolean>(false);
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
    if (isConnected && !userInfo && !loadingUserInfo) {
      setLoadingUserInfo(true);
      plugin.api.getUserInfo()
        .then(data => {
          setUserInfo(data);
          setLoadingUserInfo(false);
        })
        .catch(err => {
          dump("Failed to fetch user info:", err);
          setLoadingUserInfo(false);
        });
    } else if (!isConnected && (userInfo || loadingUserInfo)) {
      setUserInfo(null);
      setLoadingUserInfo(false);
    }
  }, [isConnected, plugin.api, userInfo, loadingUserInfo]);

  useEffect(() => {
    if (iconRef.current) {
      iconRef.current.empty();
      setIcon(iconRef.current, isConnected ? "wifi" : "wifi-off");
    }
  }, [isConnected]);

  // 现代化的 Markdown 表格渲染，移动端自动转为卡片列表
  const renderMarkdownTable = (content: string) => {
    const lines = content.split('\n');
    const tableData = lines.filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
    if (tableData.length < 2) return null;

    const parseRow = (row: string) => row.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(s => s.trim());
    const headerRow = parseRow(tableData[0]);
    const bodyRows = tableData.slice(2).map(parseRow);

    // 解析链接并在新窗口打开
    const handleMethodClick = (htmlContent: string) => {
      const match = htmlContent.match(/href=['"]([^'"]+)['"]/);
      if (match && match[1]) {
        window.open(match[1], '_blank');
      }
    };

    return (
      <div className="fns-setup-methods">
        {bodyRows.map((row, i) => (
          <div key={i} className="fns-method-card" onClick={() => handleMethodClick(row[1])}>
            <div className="fns-method-icon">
              <span dangerouslySetInnerHTML={{ __html: i === 0 ? "🛠️" : "☁️" }} />
            </div>
            <div className="fns-method-info">
              <div className="fns-method-title">{row[0]}</div>
              <div className="fns-method-desc" dangerouslySetInnerHTML={{ __html: row[1] }} />
            </div>
            <div className="fns-method-arrow">→</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fns-remote-config-container">
      <div className="fns-setup-group-card">
        <div className="fns-setup-content">
          {renderMarkdownTable($("setting.remote.setup_table"))}

          <div className="fns-action-group">
            <button className="fns-premium-btn" onClick={() => handleClipboardClick(plugin)}>
              <span className="fns-btn-icon">📋</span>
              {$("setting.remote.paste_config")}
            </button>

            <div className={`fns-status-pill ${isConnected ? 'is-connected' : 'is-disconnected'}`}>
              <div className="fns-status-dot" />
              <span className="fns-status-label">
                {isConnected ? $("setting.remote.connected") : $("setting.remote.disconnected")}
              </span>
              {isConnected && userInfo && (
                <div className="fns-status-account">
                  <span className="fns-sep">/</span>
                  <span className="fns-account-name">{userInfo.username}</span>
                  <span className="fns-uid-badge">ID:{userInfo.uid}</span>
                </div>
              )}
            </div>

            {plugin.clipboardReadTip && (
              <div className="fns-paste-toast">{plugin.clipboardReadTip}</div>
            )}
          </div>
        </div>
      </div>
    </div>
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
