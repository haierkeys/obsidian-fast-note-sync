# WebSocket API: 清理配置 (SettingClear) 对接文档

本文档描述了如何通过 WebSocket 接口清理指定笔记库（Vault）的所有配置信息。

## 1. 客户端请求 (Client -> Server)

客户端发送一个 JSON 消息来请求清理指定笔记本的配置。

- **Action**: `SettingClear`
- **Data 结构**: `SettingClearRequest`

### 消息示例
```json
{
    "action": "SettingClear",
    "data": {
        "vault": "我的笔记库"
    }
}
```

### 字段说明
| 字段名 | 类型   | 必填 | 说明                      |
|:-------|:-------|:-----|:--------------------------|
| vault  | string | 是   | 要清理的笔记本（Vault）名称 |

---

## 2. 服务端响应 (Server -> Client)

服务端处理完成后，会向发起请求的连接发送操作结果。

### 成功响应示例
```json
{
    "code": 200,
    "msg": "success",
    "action": "SettingClear",
    "vault": "我的笔记库"
}
```

---

## 3. 服务端广播 (Server -> Other Clients)

为了保持多端同步，服务端在处理成功后，会向该用户**除发起者外**的所有其他在线客户端广播清理消息。

- **Action**: `SettingSyncClear`

### 广播消息示例
```json
{
    "code": 200,
    "msg": "success",
    "action": "SettingSyncClear",
    "vault": "我的笔记库",
    "data": null
}
```

### 前端处理建议
1. 当收到 `action: "SettingSyncClear"` 时，前端应清空本地对应 `vault` 的所有配置缓存或存储。
2. 建议在发起 `SettingClear` 请求前，显式弹出确认框提示用户该操作为**物理清理**且不可逆。

---

## 4. 错误处理

如果发生错误（如 Vault 不存在或数据库异常），服务端会返回对应的错误代码：

| Code | 说明                        |
|:-----|:----------------------------|
| 400  | 参数错误 (如未传 vault)     |
| 473  | 清理失败 (数据库或系统异常) |
| 401  | 认证失效                    |
