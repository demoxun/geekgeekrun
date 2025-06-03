# Boss API Service

This service provides an API interface to interact with the Boss Zhipin automation logic.

## Configuration

The core automation logic relies on configuration files located within the `packages/geek-auto-start-chat-with-boss/default-config-file` directory, primarily:
*   `boss.json`: Contains various operational parameters, job matching strategies, and filter settings.
*   `target-company-list.json`: A list of target companies.

These files are read by the underlying automation module when it initializes. Currently, the API service does not provide endpoints to directly modify these core configuration files at runtime. Changes to these files require restarting the application or redeploying the service for the automation module to pick them up.

The API *does* allow overriding job search filters at runtime via the `/jobs/filter` endpoint. If filters are set via this API, they will take precedence over the filter combinations generated from `boss.json` for the duration of the automation run initiated with those filters.

User-specific data like cookies and local storage are managed by the API:
*   Cookies are handled via the `/login/initiate` or `/login/cookies` endpoints.
*   Browser local storage data for Boss Zhipin is read by the API from `packages/geek-auto-start-chat-with-boss/default-storage-file/boss-local-storage.json` when starting automation.
