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

### 1. `FileUpload`
**触发场景**: `FileUploadCheck` 后，服务端通知需要上传内容。
**Response Data Structure** (`Response.data`)：

```typescript
interface FileUploadData {
  path: string;       // 文件路径
  ctime: number;      // 创建时间戳 (毫秒)
  mtime: number;      // 修改时间戳 (毫秒)
  sessionId: string;  // 【关键】上传会话ID (用于后续分块上传)
  chunkSize: number;  // 建议的分块大小 (字节，默认 1048576 = 1MB)
}
```
**完整消息示例**:
```text
FileUpload|{"code":0,"status":"success","msg":"","data":{"path":"test.pdf","ctime":1702345678000,"mtime":1702345678000,"sessionId":"550e8400-e29b-41d4-a716-446655440000","chunkSize":1048576}}
```

### 2. `FileSyncMtime`
**触发场景**: 文件内容一致但修改时间不一致，仅需更新元数据。
**Response Data Structure**:

```typescript
interface FileSyncMtimeData {
  path: string;   // 文件路径
  ctime: number;  // 创建时间戳 (毫秒)
  mtime: number;  // 修改时间戳 (毫秒)
}
```

### 3. `FileNeedUpload`
**触发场景**: 同步时发现客户端文件需要上传（客户端文件比服务端新，或服务端没有该文件）。
**Response Data Structure**:

```typescript
interface FileNeedUploadData {
  path: string; // 文件路径
}
```

### 4. `FileSyncUpdate`
**触发场景**: 通知客户端下载或更新文件（服务端文件比客户端新，或客户端没有该文件）。
**Response Data Structure**:

```typescript
interface FileSyncUpdateData {
  path: string;             // 文件路径
  pathHash: string;         // 路径哈希值
  contentHash: string;      // 内容哈希值
  savePath: string;         // 服务端文件存储路径 (需拼接下载 URL)
  size: number;             // 文件大小 (字节)
  ctime: number;            // 创建时间戳 (毫秒)
  mtime: number;            // 修改时间戳 (毫秒)
  lastTime: number;         // 记录更新时间戳 (毫秒)
}
```

**下载文件**: 使用 `savePath` 拼接下载接口地址，例如：`https://your-domain.com/api/download?path=${savePath}`

### 5. `FileSyncDelete`
**触发场景**: 通知客户端删除文件。
**Response Data Structure**:

```typescript
interface FileSyncDeleteData {
  path: string; // 要删除的文件路径
}
```

### 6. `FileSyncEnd`
**触发场景**: 文件同步检查结束。
**Response Data Structure**:

```typescript
interface FileSyncEndData {
  vault: string;    // 仓库名称
  lastTime: number; // 服务端最新时间戳 (毫秒，用于下次增量同步)
}
```

### 7. `FileSyncChunkDownload`
**触发场景**: 响应 `FileChunkDownload` 请求，通知客户端准备接收文件分片。
**Response Data Structure**:

```typescript
interface FileSyncChunkDownloadData {
  path: string;        // 文件路径
  ctime: number;       // 创建时间戳 (毫秒)
  mtime: number;       // 修改时间戳 (毫秒)
  sessionId: string;   // 【关键】下载会话ID (用于标识二进制分片)
  chunkSize: number;   // 分块大小 (字节，默认 1048576 = 1MB)
  totalChunks: number; // 总分块数
  size: number;        // 文件总大小 (字节)
}
```

**完整消息示例**:
```text
FileSyncChunkDownload|{"code":0,"status":"success","msg":"","data":{"path":"test.pdf","ctime":1702345678000,"mtime":1702345678000,"sessionId":"550e8400-e29b-41d4-a716-446655440000","chunkSize":1048576,"totalChunks":5,"size":5242880}}
```

**接收流程**:
1. 发送 `FileChunkDownload` 请求
2. 收到 `FileSyncChunkDownload` 响应，获取会话信息
3. 准备接收二进制分片消息
4. 按 `chunkIndex` 顺序重组文件
5. 验证文件大小是否与 `size` 一致

---

## 客户端请求 (Client Requests)

客户端发送消息格式必须为 `Action|JSON`。

### 1. 检查文件上传 (`FileUploadCheck`)
**用途**: 检查文件是否需要上传，服务端会根据文件状态返回不同响应。
**Format**: `FileUploadCheck|{...}`

**JSON Data**:
```typescript
{
  vault: string;        // 仓库名称
  path: string;         // 文件路径
  pathHash: string;     // 路径哈希值 (必填)
  contentHash: string;  // 内容哈希值 (必填)
  ctime: number;        // 创建时间戳 (毫秒，必填)
  mtime: number;        // 修改时间戳 (毫秒，必填)
  size: number;         // 文件大小 (字节)
}
```

**可能的响应**:
- `FileUpload`: 需要上传文件内容
- `FileSyncMtime`: 仅需更新修改时间
- 无响应 (code: 成功但无需更新)

### 2. 二进制分块传输 (Binary Frame)
**用途**: 上传文件的二进制数据块。
**注意**: 此消息 **不使用** `Action|JSON` 文本格式，而是直接发送 **Binary Message**。

**二进制结构**:
```
[SessionID (36 bytes)] [ChunkIndex (4 bytes BigEndian)] [ChunkData (N bytes)]
```

- **SessionID**: 从 `FileUpload` 响应中获取的会话 ID (UUID 字符串，36 字节)
- **ChunkIndex**: 分块索引 (从 0 开始，4 字节大端序整数)
- **ChunkData**: 实际文件数据

**上传流程**:
1. 发送 `FileUploadCheck` 请求
2. 收到 `FileUpload` 响应，获取 `sessionId` 和 `chunkSize`
3. 将文件按 `chunkSize` 分块
4. 依次发送每个分块的二进制数据
5. 所有分块上传完成后，服务端自动处理并广播 `FileSyncUpdate`

### 3. 文件删除 (`FileDelete`)
**用途**: 删除指定文件。
**Format**: `FileDelete|{...}`

**JSON Data**:
```typescript
{
  vault: string;   // 仓库名称
  path: string;    // 要删除的文件路径
  pathHash: string; // 路径哈希值
}
```

**响应**: 成功后会广播 `FileSyncDelete` 给所有客户端。

### 4. 批量文件同步检查 (`FileSync`)
**用途**: 批量检查文件更新，用于增量同步。
**Format**: `FileSync|{...}`

**JSON Data**:
```typescript
{
  vault: string;      // 仓库名称
  lastTime: number;   // 上次同步的时间戳 (毫秒，首次同步传 0)
  files: Array<{      // 客户端当前文件列表
    path: string;         // 文件路径
    pathHash: string;     // 路径哈希值
    contentHash: string;  // 内容哈希值
    mtime: number;        // 修改时间戳 (毫秒)
  }>;
}
```

**同步逻辑**:
服务端会比较客户端文件列表与服务端文件,并返回以下消息组合:

- `FileSyncUpdate`: 客户端需要下载的文件
- `FileNeedUpload`: 客户端需要上传的文件
- `FileSyncMtime`: 仅需更新修改时间的文件
- `FileSyncDelete`: 客户端需要删除的文件
- `FileSyncEnd`: 同步结束 (必定最后发送)

### 5. 文件分片下载 (`FileChunkDownload`)
**用途**: 请求下载文件,服务端会通过二进制分片方式发送文件内容。
**Format**: `FileChunkDownload|{...}`

**JSON Data**:
```typescript
{
  vault: string;     // 仓库名称
  path: string;      // 文件路径
  pathHash: string;  // 路径哈希值 (可选)
}
```

**响应**: 服务端会先发送 `FileSyncChunkDownload` 消息,然后开始发送二进制分片。

### 6. 二进制分片接收 (Binary Frame - Download)
**用途**: 接收服务端发送的文件二进制数据块。
**注意**: 此消息 **不使用** `Action|JSON` 文本格式,而是直接接收 **Binary Message**。

**二进制结构**:
```
[SessionID (36 bytes)] [ChunkIndex (4 bytes BigEndian)] [ChunkData (N bytes)]
```

- **SessionID**: 从 `FileSyncChunkDownload` 响应中获取的会话 ID (UUID 字符串,36 字节)
- **ChunkIndex**: 分块索引 (从 0 开始,4 字节大端序整数)
- **ChunkData**: 实际文件数据

**下载流程**:
1. 发送 `FileChunkDownload` 请求
2. 收到 `FileSyncChunkDownload` 响应,获取 `sessionId`、`totalChunks` 和 `size`
3. 准备接收二进制分片消息
4. 按 `chunkIndex` 顺序接收并存储每个分片
5. 接收完所有分片后,重组文件
6. 验证文件大小是否与 `size` 一致

---

## 典型使用场景

### 场景 1: 用户上传新文件
```
客户端: FileUploadCheck|{...}
服务端: FileUpload|{"sessionId":"xxx","chunkSize":1048576,...}
客户端: [Binary] 分块 0
客户端: [Binary] 分块 1
客户端: [Binary] 分块 N
服务端: (自动处理完成后广播) FileSyncUpdate|{...}
```

### 场景 2: 用户删除文件
```
客户端: FileDelete|{"vault":"Default","path":"test.pdf",...}
服务端: (响应成功)
服务端: (广播给所有客户端) FileSyncDelete|{"path":"test.pdf"}
```

### 场景 3: 批量同步文件
```
客户端: FileSync|{"vault":"Default","lastTime":1702345678000,"files":[...]}
服务端: FileSyncUpdate|{...}      (需要下载的文件)
服务端: FileNeedUpload|{...}      (需要上传的文件)
服务端: FileSyncMtime|{...}       (仅需更新时间的文件)
服务端: FileSyncDelete|{...}      (需要删除的文件)
服务端: FileSyncEnd|{"lastTime":1702345999000}  (同步结束)
```

### 场景 4: 文件分片下载
```
客户端: FileChunkDownload|{"vault":"Default","path":"test.pdf","pathHash":"xxx"}
服务端: FileSyncChunkDownload|{"sessionId":"xxx","chunkSize":1048576,"totalChunks":5,"size":5242880,...}
服务端: [Binary] 分块 0 (包含 sessionId + chunkIndex + data)
服务端: [Binary] 分块 1
服务端: [Binary] 分块 2
服务端: [Binary] 分块 3
服务端: [Binary] 分块 4
客户端: (接收完成后重组文件并验证大小)
```

---

## 注意事项

1. **时间戳单位**: 所有时间戳字段 (`ctime`, `mtime`, `lastTime`) 均为**毫秒**。
2. **哈希值**: `pathHash` 和 `contentHash` 用于快速比对,建议使用 MD5 或 SHA256。
3. **分块上传**: 大文件必须分块上传,默认分块大小为 1MB,可根据 `FileUpload` 响应中的 `chunkSize` 调整。
4. **分块下载**: 服务端会自动将文件分块发送,客户端需按 `chunkIndex` 顺序接收并重组。
5. **会话超时**: 上传/下载会话有超时限制 (上传默认 5 分钟,下载默认 30 秒),超时后需重新发起请求。
6. **广播机制**: 文件修改、删除操作会广播给同一用户的所有在线客户端,实现多端同步。
7. **二进制消息格式**: 上传和下载的二进制分片格式完全一致,都是 `[SessionID][ChunkIndex][Data]`。