# Boss 直聘 API

## 概述

本 API 提供了一个与 Boss 直聘特定功能进行交互的接口，主要侧重于自动化求职和互动任务。它使用 Node.js 和 Express 构建。

核心业务逻辑，包括通过 Puppeteer进行的浏览器自动化，已封装在此 API 中。

## 安装与运行

1.  **导航到 API 目录：**
    ```bash
    cd /path/to/your/project/api
    ```

2.  **安装依赖：**
    ```bash
    npm install
    ```

3.  **配置：**
    确保 `api/config/` 目录下存在必要的配置文件。这些文件包括：
    *   `boss.json`: 主要操作设置。
    *   `target-company-list.json`: 目标公司列表。
    *   `job-filter-conditions.json`: 预定义的职位筛选条件。
    *   `job-filter-industry-filter-exemption.json`: 行业筛选豁免条件。
    有关这些文件内容的详细信息，请参阅原始项目的配置文件结构。默认/示例版本在设置过程中已复制。

4.  **初次登录 (生成 Cookie)：**
    在使用大多数 API 功能之前，您需要执行初次登录以生成会话 Cookie。
    *   启动 API 服务器 (见步骤 5)。
    *   向 `/api/auth/login` 发送 POST 请求。这将启动一个浏览器窗口。
        ```bash
        curl -X POST http://localhost:3000/api/auth/login
        ```
        (或使用 Postman 等工具)。
    *   在启动的浏览器窗口中手动登录 Boss 直聘 (例如，通过扫描二维码)。
    *   成功登录后，Cookie 将保存到 `api/storage/boss-cookies.json`。
    *   您可以通过 SSE 端点 `/api/auth/events` 监控登录进度。

5.  **运行服务器：**
    ```bash
    npm start
    ```
    或直接运行：
    ```bash
    node index.mjs
    ```
    服务器通常在端口 3000 上运行。

## API 端点

以下是可用的 API 端点列表。

---

### 根路径

*   **GET /**
    *   **描述：** 一个简单的健康检查或欢迎端点。
    *   **响应 (200 OK):**
        ```
        Hello from Boss Zhipin API!
        ```

---

### 测试

*   **GET /api/launch-test**
    *   **描述：** 用于验证 Puppeteer 是否可以启动、打开页面并关闭的测试端点。
    *   **响应 (200 OK):**
        ```json
        {
          "message": "Puppeteer launched via utility and closed successfully.",
          "pageTitle": "Google"
        }
        ```
    *   **错误响应 (500 Internal Server Error):**
        ```json
        {
          "error": {
            "message": "Failed to launch Puppeteer via utility",
            "type": "Error",
            "details": "Specific error message from Puppeteer"
          }
        }
        ```

---

### 认证

*   **POST /api/auth/login**
    *   **描述：** 启动手动登录 Boss 直聘的流程。将启动一个浏览器窗口供用户交互。成功登录后会保存 Cookie。
    *   **请求体 (可选):**
        ```json
        {
          "headless": false // 可选, 默认为 false 以便登录。设置为 true 会尝试无头模式 (不建议用于初始二维码登录)。
        }
        ```
    *   **响应 (202 Accepted):**
        ```json
        {
          "message": "Login process initiated. Please follow instructions in the launched browser window."
        }
        ```
    *   **注意：** 这是一个非阻塞调用。请通过 `/api/auth/events` 监控登录状态。

*   **GET /api/auth/status**
    *   **描述：** 检查登录 Cookie 是否存在。
    *   **响应 (200 OK):**
        *   已登录:
            ```json
            {
              "loggedIn": true,
              "message": "Cookies found."
            }
            ```
        *   未登录:
            ```json
            {
              "loggedIn": false,
              "message": "No cookies found."
            }
            ```

*   **POST /api/auth/logout**
    *   **描述：** 清除存储的登录 Cookie。
    *   **响应 (200 OK):**
        ```json
        {
          "success": true,
          "message": "Cookies cleared successfully."
        }
        ```

*   **GET /api/auth/events**
    *   **描述：** Server-Sent Events (SSE) 端点，用于在登录过程中接收实时更新。
    *   **事件：**
        *   `connected`: 初始连接确认。
        *   `loginPageLoaded`: 浏览器已加载登录页面。
        *   `loginSuccess`: 用户已成功登录。
        *   `loginFailed`: 登录尝试失败。
    *   **事件流示例：**
        ```
        event: connected
        data: {"message":"Listening for login events..."}

        event: loginPageLoaded
        data: {"message":"Login page loaded in browser. Awaiting user action."}

        event: loginSuccess
        data: {"message":"Login successful!","partialCookies":[{"name":"..."}]}
        ```

---

### 职位

*这些职位相关端点的核心 Puppeteer 逻辑 (筛选器应用、详细抓取、分页) 目前处于占位状态，需要根据原始脚本进行完整实现。*

*   **GET /api/jobs/recommend**
    *   **描述：** 获取推荐职位列表。(目前为占位逻辑)。
    *   **查询参数：**
        *   `page` (number, 可选, 默认: 1): 分页页码。
        *   `pageSize` (number, 可选, 默认: 10): 每页项目数。
    *   **响应 (200 OK - 占位符):**
        ```json
        {
          "jobs": [
            // 职位对象数组 - 结构待完整实现后定义
          ],
          "page": 1,
          "totalPages": 1 // 近似值
        }
        ```
    *   **错误响应 (400 Bad Request):** 无效分页参数。
        ```json
        {
          "error": {
            "message": "Invalid pagination parameters: page and pageSize must be positive, pageSize <= 100.",
            "type": "Error"
          }
        }
        ```
    *   **错误响应 (401 Unauthorized):** 如果未登录。
        ```json
        {
          "error": {
            "message": "Not logged in. Please login first.",
            "type": "Error"
          }
        }
        ```

*   **POST /api/jobs/search**
    *   **描述：** 根据指定条件搜索职位。(目前为占位逻辑)。
    *   **请求体：**
        ```json
        {
          // 搜索条件对象 - 结构待完整实现后定义
          "keywords": "软件工程师",
          "city": "北京"
        }
        ```
    *   **响应 (200 OK - 占位符):**
        ```json
        {
          "jobs": [],
          "message": "Search functionality is a placeholder."
        }
        ```
    *   **错误响应 (400 Bad Request):** 如果缺少搜索条件。
        ```json
        {
          "error": {
            "message": "Search criteria are required in the request body.",
            "type": "Error"
          }
        }
        ```

---

### 聊天

*聊天发起的核心 Puppeteer 逻辑目前处于占位状态。*

*   **POST /api/chat/start**
    *   **描述：** 与特定职位的 Boss/HR 发起聊天。(目前为占位逻辑)。
    *   **请求体：**
        ```json
        {
          "jobId": "string (encryptJobId)",
          "bossId": "string (encryptBossId/encryptUserId)",
          "greeting": "string (可选)"
        }
        ```
    *   **响应 (200 OK - 占位符):**
        ```json
        {
          "success": true,
          "message": "Chat started successfully (simulated).",
          "details": { /* 来自 Boss 直聘的模拟响应 */ }
        }
        ```
    *   **错误响应 (400 Bad Request):** `jobId`/`bossId` 缺失或无效。
        ```json
        {
          "error": {
            "message": "jobId and bossId are required and must be strings.",
            "type": "Error"
          }
        }
        ```
    *   **错误响应 (401 Unauthorized):** 如果未登录。
    *   **错误响应 (409 Conflict):** 如果因业务规则 (例如每日聊天限制) 导致聊天发起失败。

---

## 错误处理

API 使用集中式错误处理程序。错误以标准 JSON 格式返回：

```json
{
  "error": {
    "message": "描述性错误消息。",
    "type": "ErrorName", // 例如："Error", "SyntaxError"
    // "details": "可选的附加详细信息或原始错误消息",
    // "stack": "错误堆栈跟踪 (仅在开发环境中)"
  }
}
```
常用的 HTTP 状态码：
*   `200 OK`: GET 请求成功。
*   `201 Created`: POST 请求成功创建资源 (尚未使用)。
*   `202 Accepted`: 请求已接受处理，但尚未完成 (例如 `/api/auth/login`)。
*   `400 Bad Request`: 输入无效、缺少参数或请求体格式错误。
*   `401 Unauthorized`: 需要或认证失败 (例如 Cookie 丢失/无效)。
*   `404 Not Found`: 端点或资源不存在。
*   `409 Conflict`: 请求与服务器当前状态冲突 (例如业务规则冲突，如聊天限制)。
*   `500 Internal Server Error`: 意外的服务器端错误。

EOF
echo "api/README.md updated to Chinese successfully."
