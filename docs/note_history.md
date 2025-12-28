---
title: 默认模块
language_tabs:
  - shell: Shell
  - http: HTTP
  - javascript: JavaScript
  - ruby: Ruby
  - python: Python
  - php: PHP
  - java: Java
  - go: Go
toc_footers: []
includes: []
search: true
code_clipboard: true
highlight_theme: darkula
headingLevel: 2
generator: "@tarslib/widdershins v4.0.30"

---

# 默认模块

Base URLs:

# Authentication

# 笔记管理

## GET 笔记历史列表

GET /api/note/histories

> Body 请求参数

```yaml
vault: defaultVault
pageSize: 5
page: 1
path: 测试哈哈2.md
path_hash: "-149114541"

```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|page|query|string| 否 |none|
|locale|header|string| 否 |none|
|token|header|string| 是 |none|
|body|body|object| 否 |none|
|» vault|body|string| 是 |none|
|» pageSize|body|integer| 否 |none|
|» page|body|integer| 否 |none|
|» path|body|string| 否 |none|
|» path_hash|body|string| 否 |none|

> 返回示例

```json
{
  "code": 1,
  "status": true,
  "message": "成功",
  "data": {
    "list": [
      {
        "id": 405,
        "noteId": 409,
        "vaultId": 1,
        "path": "22222.md",
        "clientName": "Web",
        "version": 2,
        "createdAt": "2025-12-27 03:58:32"
      },
      {
        "id": 9,
        "noteId": 409,
        "vaultId": 1,
        "path": "22222.md",
        "clientName": "",
        "version": 1,
        "createdAt": "2025-12-27 01:45:19"
      }
    ],
    "pager": {
      "page": 1,
      "pageSize": 5,
      "totalRows": 2
    }
  }
}
```

```json
{
  "code": 553,
  "status": false,
  "message": "笔记列表获取失败",
  "data": null,
  "details": "record not found"
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

状态码 **200**

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|integer|true|none||none|
|» status|boolean|true|none||none|
|» message|string|true|none||none|
|» data|object|true|none||none|
|»» list|[object]|true|none||none|
|»»» id|integer|true|none||none|
|»»» noteId|integer|true|none||none|
|»»» vaultId|integer|true|none||none|
|»»» path|string|true|none||none|
|»»» diffPatch|string|true|none||none|
|»»» clientName|string|true|none||none|
|»»» version|integer|true|none||none|
|»»» createdAt|string|true|none||none|
|»» pager|object|true|none||none|
|»»» page|integer|true|none||none|
|»»» pageSize|integer|true|none||none|
|»»» totalRows|integer|true|none||none|

## GET 笔记历史详情

GET /api/note/history

> Body 请求参数

```yaml
id: "405"

```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|locale|header|string| 否 |none|
|token|header|string| 是 |none|
|body|body|object| 否 |none|
|» id|body|string| 是 |none|

> 返回示例

> 200 Response

```json
{
  "code": 1,
  "status": true,
  "message": "成功",
  "data": {
    "id": 405,
    "noteId": 409,
    "vaultId": 1,
    "path": "22222.md",
    "diffs": [
      {
        "Type": 0,
        "Text": "222222233333"
      },
      {
        "Type": 1,
        "Text": " 测试一下"
      }
    ],
    "content": "222222233333",
    "clientName": "Web",
    "version": 2,
    "createdAt": "2025-12-27 03:58:32"
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|Inline|

### 返回数据结构

状态码 **200**

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|» code|integer|true|none||none|
|» status|boolean|true|none||none|
|» message|string|true|none||none|
|» data|object|true|none||none|
|»» id|integer|true|none||none|
|»» noteId|integer|true|none||none|
|»» vaultId|integer|true|none||none|
|»» path|string|true|none||none|
|»» diffPatch|string|true|none||none|
|»» content|string|true|none||none|
|»» clientName|string|true|none||none|
|»» version|integer|true|none||none|
|»» createdAt|string|true|none||none|

# 数据模型

