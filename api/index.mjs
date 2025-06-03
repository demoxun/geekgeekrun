import express from 'express';
// Import launchBrowser from the new utility file
import { launchBrowser } from './utils/puppeteer-setup.mjs';

// Auth service imports
import { initiateLoginProcess, loadCookies, clearCookies, loginEventBus } from './services/auth-service.mjs';
import { centralErrorHandler } from './middleware/error-handler.mjs'; // Added

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Ensure this is high up for POST body parsing

app.get('/', (req, res) => {
  res.send('Hello from Boss Zhipin API!');
});

// Example: Endpoint to launch puppeteer using the new utility
app.get('/api/launch-test', async (req, res, next) => { // Added next
  try {
    // Use launchBrowser utility
    const browser = await launchBrowser({ headless: true }); // Example: pass headless option
    const page = await browser.newPage();
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    const title = await page.title();
    await browser.close();
    res.json({ message: 'Puppeteer launched via utility and closed successfully.', pageTitle: title });
  } catch (error) {
    // console.error('Error launching Puppeteer via utility:', error); // Logging handled by central
    // res.status(500).json({ error: 'Failed to launch Puppeteer via utility', details: error.message });
    next(error); // Pass to central error handler
  }
});

// --- Auth Endpoints ---

// Endpoint to start the login process
app.post('/api/auth/login', async (req, res, next) => { // Added next
  try {
    // Basic validation for headless flag
    if (req.body.headless !== undefined && typeof req.body.headless !== 'boolean') {
      const validationError = new Error('Invalid input: headless must be a boolean.');
      validationError.statusCode = 400;
      return next(validationError);
    }

    res.status(202).json({ message: "Login process initiated. Please follow instructions in the launched browser window." });

    initiateLoginProcess({ headless: req.body.headless === true }) // allow headless override via body
      .then(result => {
        console.log("Login process finished with result:", result.message);
        // Here you could use a webhook, WebSocket, or another mechanism to notify the original client
        // For now, just logging server-side.
      })
      .catch(error => {
        // This error is from the async process, not directly in the req-res cycle for this response.
        // It should be logged or handled via other means (e.g., SSE event).
        console.error("Async Login process failed:", error.message);
      });

  } catch (error) {
    // This catch is for sync errors in initiating the process.
    // console.error('Error initiating login process:', error);
    if (!res.headersSent) { // Ensure response isn't sent twice
        next(error);
    } else {
        console.error("Error after headers sent in /api/auth/login:", error.message);
    }
  }
});

// Endpoint to check login status (presence of cookies)
app.get('/api/auth/status', async (req, res, next) => { // Added next
  try {
    const cookies = await loadCookies();
    if (cookies && cookies.length > 0) {
      // A more sophisticated check might try to validate the cookies by making a lightweight request to a protected zhipin page
      res.json({ loggedIn: true, message: 'Cookies found.' });
    } else {
      res.json({ loggedIn: false, message: 'No cookies found.' });
    }
  } catch (error) {
    next(error);
  }
});

// Endpoint to logout (clear cookies)
app.post('/api/auth/logout', async (req, res, next) => { // Added next
  try {
    await clearCookies();
    res.json({ success: true, message: 'Cookies cleared successfully.' });
  } catch (error) {
    next(error);
  }
});

// SSE endpoint for login events (optional, for better client feedback)
app.get('/api/auth/events', (req, res, next) => { // Added next for consistency, though SSE has its own error handling
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish the connection.

    const sendEvent = (eventName, data) => {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    // ... (rest of SSE logic) ...
    const onLoginPageLoaded = () => sendEvent('loginPageLoaded', { message: 'Login page loaded in browser. Awaiting user action.' });
    const onLoginSuccess = (cookies) => sendEvent('loginSuccess', { message: 'Login successful!', partialCookies: cookies.slice(0,2) });
    const onLoginFailed = (error) => sendEvent('loginFailed', { message: `Login failed: ${error.message}` });

    loginEventBus.on('loginPageLoaded', onLoginPageLoaded);
    loginEventBus.on('loginSuccess', onLoginSuccess);
    loginEventBus.on('loginFailed', onLoginFailed);

    req.on('close', () => {
      loginEventBus.off('loginPageLoaded', onLoginPageLoaded);
      loginEventBus.off('loginSuccess', onLoginSuccess);
      loginEventBus.off('loginFailed', onLoginFailed);
      res.end();
      console.log("SSE connection closed for auth events.");
    });
    sendEvent('connected', { message: 'Listening for login events...' });
  } catch (error) {
    // Hard to use next(error) here as headers are already sent.
    console.error("Error in SSE handler setup:", error);
    if (!res.writableEnded) {
        res.end();
    }
  }
});

// Job service imports
import { getRecommendedJobs, searchJobs, startChatWithBoss } from './services/job-service.mjs';

// --- Job Endpoints ---

app.get('/api/jobs/recommend', async (req, res, next) => { // Added next
  try {
    // Basic pagination and filtering (TODO: expand filter capabilities)
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    if (page < 1 || pageSize < 1 || pageSize > 100) {
        const validationError = new Error('Invalid pagination parameters: page and pageSize must be positive, pageSize <= 100.');
        validationError.statusCode = 400;
        return next(validationError);
    }
    const result = await getRecommendedJobs({}, { page, pageSize });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/jobs/search', async (req, res, next) => { // Added next
  try {
    const searchCriteria = req.body; // Expects filter criteria in the request body
    if (!searchCriteria || Object.keys(searchCriteria).length === 0) {
      const validationError = new Error('Search criteria are required in the request body.');
      validationError.statusCode = 400;
      return next(validationError);
    }
    // Add more specific validation for searchCriteria properties if needed
    // Example: if (typeof searchCriteria.query !== 'string') { ... }
    const result = await searchJobs(searchCriteria);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// --- Chat Endpoint ---
app.post('/api/chat/start', async (req, res, next) => { // Added next
  try {
    const { jobId, bossId, greeting } = req.body; // bossId is likely encryptUserId
    if (!jobId || !bossId) {
      const validationError = new Error('jobId and bossId are required.');
      validationError.statusCode = 400;
      return next(validationError);
    }
    if (typeof jobId !== 'string' || typeof bossId !== 'string') {
      const validationError = new Error('jobId and bossId must be strings.');
      validationError.statusCode = 400;
      return next(validationError);
    }
    if (greeting !== undefined && typeof greeting !== 'string') {
        const validationError = new Error('greeting must be a string if provided.');
        validationError.statusCode = 400;
        return next(validationError);
    }

    const result = await startChatWithBoss(jobId, bossId, greeting);
    res.json(result);
  } catch (error) {
    // Specific error handling for 401, 409 already in the original code, can be kept or centralized
    // For now, let central handler deal with status codes based on error.statusCode
    next(error);
  }
});

// Central Error Handler - MUST be defined after all other app.use() and routes
app.use(centralErrorHandler);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

export default app;
