# Boss Zhipin API

## Overview

This API provides an interface to interact with certain Boss Zhipin functionalities, primarily focused on automating job searching and interaction tasks. It is built using Node.js and Express.

The core business logic, including browser automation via Puppeteer, is encapsulated within this API.

## Setup and Running

1.  **Navigate to the API directory:**
    ```bash
    cd /path/to/your/project/api
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configuration:**
    Ensure the necessary configuration files are present in the `api/config/` directory. These include:
    *   `boss.json`: Main operational settings.
    *   `target-company-list.json`: List of target companies.
    *   `job-filter-conditions.json`: Predefined job filter conditions.
    *   `job-filter-industry-filter-exemption.json`: Industry filter exemptions.
    Refer to the original project's configuration file structure for details on their content. Default/example versions are copied during setup.

4.  **Initial Login (Cookie Generation):**
    Before most API functionalities can be used, you need to perform an initial login to generate session cookies.
    *   Start the API server (see step 5).
    *   Send a POST request to `/api/auth/login`. This will launch a browser window.
        ```bash
        curl -X POST http://localhost:3000/api/auth/login
        ```
        (Or use a tool like Postman).
    *   Manually log in to Boss Zhipin in the launched browser window (e.g., by scanning a QR code).
    *   Once login is successful, cookies will be saved to `api/storage/boss-cookies.json`.
    *   You can monitor the login progress via the SSE endpoint `/api/auth/events`.

5.  **Run the server:**
    ```bash
    npm start
    ```
    Or directly:
    ```bash
    node index.mjs
    ```
    The server typically runs on port 3000.

## API Endpoints

Below is a list of available API endpoints.

---

### Root

*   **GET /**
    *   **Description:** A simple health check or welcome endpoint.
    *   **Response (200 OK):**
        ```
        Hello from Boss Zhipin API!
        ```

---

### Test

*   **GET /api/launch-test**
    *   **Description:** A test endpoint to verify that Puppeteer can launch, open a page, and close.
    *   **Response (200 OK):**
        ```json
        {
          "message": "Puppeteer launched via utility and closed successfully.",
          "pageTitle": "Google"
        }
        ```
    *   **Error Response (500 Internal Server Error):**
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

### Authentication

*   **POST /api/auth/login**
    *   **Description:** Initiates the manual login process to Boss Zhipin. Launches a browser window for user interaction. Cookies are saved upon successful login.
    *   **Request Body (optional):**
        ```json
        {
          "headless": false // Optional, defaults to false for login. Set to true to attempt headless (not recommended for initial QR login).
        }
        ```
    *   **Response (202 Accepted):**
        ```json
        {
          "message": "Login process initiated. Please follow instructions in the launched browser window."
        }
        ```
    *   **Note:** This is a non-blocking call. Monitor `/api/auth/events` for login status.

*   **GET /api/auth/status**
    *   **Description:** Checks if login cookies exist.
    *   **Response (200 OK):**
        *   If logged in:
            ```json
            {
              "loggedIn": true,
              "message": "Cookies found."
            }
            ```
        *   If not logged in:
            ```json
            {
              "loggedIn": false,
              "message": "No cookies found."
            }
            ```

*   **POST /api/auth/logout**
    *   **Description:** Clears the stored login cookies.
    *   **Response (200 OK):**
        ```json
        {
          "success": true,
          "message": "Cookies cleared successfully."
        }
        ```

*   **GET /api/auth/events**
    *   **Description:** Server-Sent Events (SSE) endpoint to receive real-time updates during the login process.
    *   **Events:**
        *   `connected`: Initial connection confirmation.
        *   `loginPageLoaded`: Browser has loaded the login page.
        *   `loginSuccess`: User has successfully logged in.
        *   `loginFailed`: Login attempt failed.
    *   **Example Event Stream:**
        ```
        event: connected
        data: {"message":"Listening for login events..."}

        event: loginPageLoaded
        data: {"message":"Login page loaded in browser. Awaiting user action."}

        event: loginSuccess
        data: {"message":"Login successful!","partialCookies":[{"name":"..."}]}
        ```

---

### Jobs

*The core Puppeteer logic for these job-related endpoints (filter application, detailed scraping, pagination) is currently in a placeholder state and needs full implementation based on the original scripts.*

*   **GET /api/jobs/recommend**
    *   **Description:** Fetches a list of recommended jobs. (Currently placeholder logic).
    *   **Query Parameters:**
        *   `page` (number, optional, default: 1): Page number for pagination.
        *   `pageSize` (number, optional, default: 10): Number of items per page.
    *   **Response (200 OK - Placeholder):**
        ```json
        {
          "jobs": [
            // Array of job objects - structure to be defined by full implementation
          ],
          "page": 1,
          "totalPages": 1 // Approximate
        }
        ```
    *   **Error Response (400 Bad Request):** For invalid pagination.
        ```json
        {
          "error": {
            "message": "Invalid pagination parameters: page and pageSize must be positive, pageSize <= 100.",
            "type": "Error"
          }
        }
        ```
    *   **Error Response (401 Unauthorized):** If not logged in.
        ```json
        {
          "error": {
            "message": "Not logged in. Please login first.",
            "type": "Error"
          }
        }
        ```

*   **POST /api/jobs/search**
    *   **Description:** Searches for jobs based on specified criteria. (Currently placeholder logic).
    *   **Request Body:**
        ```json
        {
          // Search criteria object - structure to be defined by full implementation
          "keywords": "Software Engineer",
          "city": "Beijing"
        }
        ```
    *   **Response (200 OK - Placeholder):**
        ```json
        {
          "jobs": [],
          "message": "Search functionality is a placeholder."
        }
        ```
    *   **Error Response (400 Bad Request):** If search criteria are missing.
        ```json
        {
          "error": {
            "message": "Search criteria are required in the request body.",
            "type": "Error"
          }
        }
        ```

---

### Chat

*The core Puppeteer logic for chat initiation is currently in a placeholder state.*

*   **POST /api/chat/start**
    *   **Description:** Initiates a chat with a Boss/HR for a specific job. (Currently placeholder logic).
    *   **Request Body:**
        ```json
        {
          "jobId": "string (encryptJobId)",
          "bossId": "string (encryptBossId/encryptUserId)",
          "greeting": "string (optional)"
        }
        ```
    *   **Response (200 OK - Placeholder):**
        ```json
        {
          "success": true,
          "message": "Chat started successfully (simulated).",
          "details": { /* Simulated response from Boss Zhipin */ }
        }
        ```
    *   **Error Response (400 Bad Request):** For missing or invalid `jobId`/`bossId`.
        ```json
        {
          "error": {
            "message": "jobId and bossId are required and must be strings.",
            "type": "Error"
          }
        }
        ```
    *   **Error Response (401 Unauthorized):** If not logged in.
    *   **Error Response (409 Conflict):** If chat initiation fails due to business rules (e.g., daily limit).

---

## Error Handling

The API uses a centralized error handler. Errors are returned in a standard JSON format:

```json
{
  "error": {
    "message": "Descriptive error message.",
    "type": "ErrorName", // e.g., "Error", "SyntaxError"
    // "details": "Optional additional details or original error message",
    // "stack": "Error stack trace (in development environment only)"
  }
}
```
Common HTTP status codes used:
*   `200 OK`: Successful GET request.
*   `201 Created`: Successful POST request that creates a resource (not explicitly used yet).
*   `202 Accepted`: Request accepted for processing, but not yet complete (e.g., `/api/auth/login`).
*   `400 Bad Request`: Invalid input, missing parameters, or malformed request body.
*   `401 Unauthorized`: Authentication required or failed (e.g., missing/invalid cookies).
*   `404 Not Found`: Endpoint or resource does not exist.
*   `409 Conflict`: Request conflicts with the current state of the server (e.g., business rule violation like chat limit).
*   `500 Internal Server Error`: Unexpected server-side error.
