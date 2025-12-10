# WebSocket File API Documentation

本文档整理了 `fast-note-sync-service` 中涉及文件的 WebSocket 消息接口，供前端对接使用。

## 核心通信协议 (Protocol)

服务端与客户端的通信采用 **自定义文本协议**，格式如下：

`Action|JSON_Payload`

- **Action**: 消息路由键/类型 (String)
- **|**: 分隔符 (Pipe)
- **JSON_Payload**: 实际数据的 JSON 字符串

**示例**:
```text
FileUploadCheck|{"vault":"Default","path":"test.md",...}
```

### JSON Payload 响应结构
服务端返回的 JSON 部分通常遵循以下统一结构：
```typescript
interface Response<T> {
  code: number;   // 状态码 (0 为成功)
  status: string; // 状态描述 (e.g. "success")
  msg: string;    // 提示信息
  data: T;        // 具体的业务数据
}
```

---

## 服务端推送消息 (Server Push Messages)

服务端会推送以下 Format 的消息：`Action|Response_JSON`

### 1. `FileNeedUpload`
**触发场景**: `FileUploadCheck` 后，服务端通知需要上传内容。
**Response Data Structure** (`Response.data`):

```typescript
interface FileNeedUploadData {
  path: string;       // 文件路径
  ctime: number;      // 创建时间 (ms)
  mtime: number;      // 修改时间 (ms)
  sessionId: string;  // 【关键】上传会话ID
  chunkSize: number;  // 建议的分块大小 (字节，如 1048576)
}
```
**完整消息示例**:
`FileNeedUpload|{"code":0,"data":{"path":"...","sessionId":"..."},...}`

### 2. `FileSyncMtime`
**触发场景**: 仅需更新元数据。
**Response Data Structure**:

```typescript
interface FileSyncMtimeData {
  path: string;   // 文件路径
  ctime: number;  // 创建时间 (ms)
  mtime: number;  // 修改时间 (ms)
}
```

### 3. `FileSyncNeedUpload`
**触发场景**: 客户端需要上传文件（通常在同步检查后）。
**Response Data Structure**:

```typescript
interface FileSyncNeedUploadData {
  path: string; // 文件路径
}
```

### 4. `FileSyncUpdate` (下载/更新)
**触发场景**: 客户端需要下载或更新文件。
**Response Data Structure** (`File` Object):

```typescript
interface FileData {
  path: string;
  vault: string;
  pathHash: string;
  contentHash: string;
  savePath: string; // 服务端上文件的存储路径 需要使用接口地址拼接
  size: number;
  mtime: number;
  ctime: number;
}
```

### 5. `FileSyncDelete`
**触发场景**: 通知客户端删除文件。
**Response Data Structure**:

```typescript
interface FileSyncDeleteData {
  path: string;
}
```

### 6. `FileSyncEnd`
**触发场景**: 同步检查结束。
**Response Data Structure**:

```typescript
interface FileSyncEndData {
  vault: string;
  lastTime: number; // 服务端最新时间戳
}
```

---

## 客户端请求 (Client Requests)

客户端发送消息格式必须为 `Action|JSON`。

### 1. 检查文件上传 (`FileUploadCheck`)
**Format**: `FileUploadCheck|{...}`

**JSON Data**:
```typescript
{
  vault: string;
  path: string;
  pathHash: string;     // 必填
  contentHash: string;  // 必填
  mtime: number;        // 必填
  ctime: number;        // 必填
  size: number;
}
```

### 2. 上传完成 (`FileUploadComplete`)
**Format**: `FileUploadComplete|{...}`

**JSON Data**:
```typescript
{
  sessionId: string;
}
```

### 3. 二进制分块传输 (Binary Frame)
**注意**: 此消息 **不使用** `Action|JSON` 文本格式，而是直接发送 **Binary Message**。

**结构**: `[SessionID (36 bytes)] [ChunkIndex (4 bytes BigEndian)] [Content (N bytes)]`

---


### 4. 批量用户文件更新检查 (`FileSync`)
**Format**: `FileSync|{...}`

**JSON Data**:
```typescript
{
  vault: string;
  lastTime: number;
  files: Array<{
    path: string;
    pathHash: string;
    contentHash?: string;
    mtime: number;
  }>;
}
```

用户1批量检查更新: FileSync->接收各类消息并处理->FileSyncEnd

用户1更新文件流程: FileUploadCheck->二进制分块传输->FileUploadComplete

用户1更新文件修改时间: FileSyncMtime-> 更新文件的修改时间

用户2接收更新 FileSyncUpdate -> 下载文件 接口地址拼接+savePath