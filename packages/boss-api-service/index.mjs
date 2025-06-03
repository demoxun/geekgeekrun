import express from 'express';
import { launchLoginProcess } from '@geekgeekrun/launch-bosszhipin-login-page-with-preload-extension/index.mjs';
import { mainLoop, closeBrowserWindow } from '@geekgeekrun/geek-auto-start-chat-with-boss/index.mjs';
import { readStorageFile } from '@geekgeekrun/geek-auto-start-chat-with-boss/runtime-file-utils.mjs';

const app = express();
const port = process.env.PORT || 3000;

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`[API Request] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware to parse JSON request bodies
app.use(express.json());

// In-memory store for cookies
let activeCookies = null;

// Automation State Variables
let automationBrowser = null;
let automationPage = null;
let automationStatus = 'idle';
let automationError = null;
let automationProcess = null;
let currentJobFilters = null;

// Helper functions for cookie management
function setActiveCookies(cookies) {
  activeCookies = cookies;
  console.log(`[API Service] ${new Date().toISOString()} - Active cookies set.`);
}

function getActiveCookies() {
  console.log(`[API Service] ${new Date().toISOString()} - Retrieved active cookies.`);
  return activeCookies;
}

app.get('/', (req, res) => {
  res.send('Boss API Service is running!');
});

// --- Login Endpoints ---
app.post('/login/initiate', async (req, res, next) => {
  console.log(`[Auth] ${new Date().toISOString()} - POST /login/initiate received`);
  if (automationStatus === 'running') {
    return res.status(409).json({ error: "Cannot initiate login while automation is running." });
  }
  let browser;
  try {
    const loginResult = await launchLoginProcess({ loadExtension: false });

    if (!loginResult || !loginResult.browser || !loginResult.cookies) {
        console.error(`[Auth] ${new Date().toISOString()} - Login process did not return valid browser or cookies.`);
        if (loginResult && loginResult.browser) {
            await loginResult.browser.close();
        }
        // Let global error handler catch this or return specific error
        return res.status(500).json({ error: "Login failed", details: "Invalid result from login process." });
    }

    browser = loginResult.browser;
    const cookies = loginResult.cookies;

    setActiveCookies(cookies);

    res.json({ message: "Login process initiated and cookies captured.", cookies: cookies });
  } catch (error) {
    console.error(`[Auth] ${new Date().toISOString()} - Login process failed: ${error.message}`);
    error.details = error.stack; // Add stack for global handler if in dev
    next(error); // Pass to global error handler
  } finally {
    if (browser) {
      try {
        console.log(`[Auth] ${new Date().toISOString()} - Closing browser from /login/initiate...`);
        await browser.close();
        console.log(`[Auth] ${new Date().toISOString()} - Browser closed successfully from /login/initiate.`);
      } catch (closeError) {
        console.error(`[Auth] ${new Date().toISOString()} - Error closing browser in /login/initiate: ${closeError.message}`);
      }
    }
  }
});

app.post('/login/cookies', (req, res) => {
  console.log(`[Auth] ${new Date().toISOString()} - POST /login/cookies received with body:`, req.body);
   if (automationStatus === 'running') {
    return res.status(409).json({ error: "Cannot set cookies while automation is running." });
  }
  const { cookies } = req.body;

  if (!cookies || !Array.isArray(cookies)) {
    return res.status(400).json({ error: "Invalid cookies format. 'cookies' should be an array." });
  }

  setActiveCookies(cookies);
  res.json({ message: "Cookies set successfully." });
});

app.get('/login/cookies', (req, res) => {
  console.log(`[Auth] ${new Date().toISOString()} - GET /login/cookies received`);
  const cookies = getActiveCookies();
  if (cookies) {
    res.json({ cookies: cookies });
  } else {
    res.json({ message: "No cookies are currently set." });
  }
});

// --- Job Filter Endpoints ---
app.post('/jobs/filter', (req, res) => {
  console.log(`[JobFilter] ${new Date().toISOString()} - POST /jobs/filter received with body:`, req.body);
  if (automationStatus === 'running') {
    return res.status(409).json({ error: "Cannot update filters while automation is running." });
  }

  const filters = req.body;
  if (!filters || typeof filters !== 'object') {
    return res.status(400).json({ error: "Invalid filter format. Body should be a filter object." });
  }

  currentJobFilters = filters;
  console.log(`[JobFilter] ${new Date().toISOString()} - Job filters updated:`, currentJobFilters);
  res.json({ message: "Job filters updated successfully.", filters: currentJobFilters });
});

app.get('/jobs/filter', (req, res) => {
  console.log(`[JobFilter] ${new Date().toISOString()} - GET /jobs/filter received`);
  if (currentJobFilters) {
    res.json({ filters: currentJobFilters });
  } else {
    res.json({ message: "No job filters set." });
  }
});

// --- Automation Control Endpoints ---
app.post('/automation/start', async (req, res, next) => {
  console.log(`[AutomationCtrl] ${new Date().toISOString()} - POST /automation/start received`);
  try {
    if (automationStatus === 'running') {
      return res.status(409).json({ error: "Automation is already running." });
    }

    const currentCookies = getActiveCookies();
    if (!currentCookies) {
      return res.status(400).json({ error: "Login required. Please set cookies first via /login/initiate or /login/cookies." });
    }

    let localStorageData;
    try {
      localStorageData = await readStorageFile('boss-local-storage.json');
      console.log(`[API Service] ${new Date().toISOString()} - Successfully read boss-local-storage.json`);
    } catch (err) {
      localStorageData = {};
      console.warn(`[API Service] ${new Date().toISOString()} - Could not read boss-local-storage.json, starting with empty local storage. Error: ${err.message}`);
    }

    const isoTimestamp = () => new Date().toISOString();

    const apiHooks = {
      puppeteerLaunched: () => { console.log(`[AutomationHooks] ${isoTimestamp()} - Puppeteer launched.`); },
      pageLoaded: () => { console.log(`[AutomationHooks] ${isoTimestamp()} - Page loaded.`); },
      cookieWillSet: (loadedCookies) => { console.log(`[AutomationHooks] ${isoTimestamp()} - Cookies will be set.`); },
      userInfoResponse: async (userInfo) => { console.log(`[AutomationHooks] ${isoTimestamp()} - User info response status: ${userInfo?.code}`); },
      mainFlowWillLaunch: async (args) => { console.log(`[AutomationHooks] ${isoTimestamp()} - Main flow will launch.`); },
      jobDetailIsGetFromRecommendList: async (jobDetail) => { console.log(`[AutomationHooks] ${isoTimestamp()} - Job detail get: ${jobDetail?.jobInfo?.jobName}`); },
      jobMarkedAsNotSuit: async (jobDetail, markInfo) => { console.log(`[AutomationHooks] ${isoTimestamp()} - Job marked as not suit: ${jobDetail?.jobInfo?.jobName}, Reason: ${markInfo?.markReason}`); },
      newChatWillStartup: async (positionInfoDetail) => { console.log(`[AutomationHooks] ${isoTimestamp()} - New chat will startup for: ${positionInfoDetail?.jobInfo?.jobName}`); },
      newChatStartup: async (positionInfoDetail, chatRunningContext) => { console.log(`[AutomationHooks] ${isoTimestamp()} - New chat started for: ${positionInfoDetail?.jobInfo?.jobName}`); },
      noPositionFoundForCurrentJob: () => { console.log(`[AutomationHooks] ${isoTimestamp()} - No position found for current job.`); },
      noPositionFoundAfterTraverseAllJob: () => { console.log(`[AutomationHooks] ${isoTimestamp()} - No position found after traversing all jobs.`); },
      errorEncounter: (errorInfo) => {
        const errorMessage = errorInfo instanceof Error ? errorInfo.message : String(errorInfo);
        console.error(`[AutomationHooks] ${isoTimestamp()} - Error encountered: ${errorMessage}`, errorInfo instanceof Error ? errorInfo.stack : '');
        automationStatus = 'error';
        automationError = errorMessage;
      },
    };

    automationStatus = 'running';
    automationError = null;

    console.log(`[AutomationCtrl] ${isoTimestamp()} - Starting automation mainLoop with filters:`, currentJobFilters);
    automationProcess = mainLoop({
        cookies: currentCookies,
        localStorageData,
        hooks: apiHooks,
        jobFilters: currentJobFilters
      })
      .then(() => {
        if (automationStatus !== 'error' && automationStatus !== 'stopping') {
          automationStatus = 'idle';
        }
        console.log(`[AutomationCtrl] ${isoTimestamp()} - Automation mainLoop finished gracefully. Status: ${automationStatus}`);
      })
      .catch((err) => {
        console.error(`[AutomationCtrl] ${isoTimestamp()} - Automation mainLoop failed: ${err.message}`, err.stack);
        if (automationStatus !== 'stopping') {
             automationStatus = 'error';
             automationError = err.message;
        }
      })
      .finally(() => {
        console.log(`[AutomationCtrl] ${isoTimestamp()} - Automation mainLoop process ended (finally block). Current status: ${automationStatus}`);
        automationProcess = null;
      });

    res.status(202).json({ message: "Automation started." });
  } catch (error) {
    console.error(`[AutomationCtrl] ${new Date().toISOString()} - Error in /automation/start: ${error.message}`);
    error.details = error.stack;
    next(error);
  }
});

app.post('/automation/stop', async (req, res, next) => {
  console.log(`[AutomationCtrl] ${new Date().toISOString()} - POST /automation/stop received`);
  try {
    if (automationStatus !== 'running' && !automationProcess) {
        return res.status(400).json({ error: "Automation is not currently running or no active process to stop." });
    }
    automationStatus = 'stopping';
    console.log(`[AutomationCtrl] ${new Date().toISOString()} - Attempting to close browser window for automation...`);
    await closeBrowserWindow();

    console.log(`[AutomationCtrl] ${new Date().toISOString()} - Browser window close request processed. Automation should be stopping or stopped.`);
    if (!automationProcess && automationStatus === 'stopping') {
        automationStatus = 'idle';
    }
    automationError = null;

    res.json({ message: "Automation stop request processed. Current status: " + automationStatus });
  } catch (error) {
    console.error(`[AutomationCtrl] ${new Date().toISOString()} - Error in /automation/stop: ${error.message}`);
    error.details = error.stack;
    automationStatus = 'error';
    automationError = error.message;
    next(error);
  }
});

app.get('/automation/status', (req, res) => {
  console.log(`[AutomationCtrl] ${new Date().toISOString()} - GET /automation/status received`);
  res.json({
    status: automationStatus,
    error: automationError,
    isProcessActive: !!automationProcess
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[API Global Error] ${timestamp} - Route: ${req.path}`);
  console.error(`[API Global Error] ${timestamp} - Error: ${err.message}`);
  console.error(`[API Global Error] ${timestamp} - Stack: ${err.stack}`);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    details: err.details || (process.env.NODE_ENV === 'development' ? err.stack : undefined)
  });
});

app.listen(port, () => {
  console.log(`[API Service] ${new Date().toISOString()} - API Service listening on port ${port}`);
});
