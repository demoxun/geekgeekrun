import fs from 'node:fs/promises';
import path from 'node:path';
import { launchBrowser } from '../utils/puppeteer-setup.mjs';
import { EventEmitter } from 'node:events';

const STORAGE_DIR = path.join(process.cwd(), 'storage'); // Corrected path
const COOKIES_PATH = path.join(STORAGE_DIR, 'boss-cookies.json');

export const loginEventBus = new EventEmitter();

async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

export async function saveCookies(cookies) {
  await ensureStorageDir();
  await fs.writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2));
  console.log('Cookies saved to:', COOKIES_PATH);
}

export async function loadCookies() {
  try {
    await fs.access(COOKIES_PATH);
    const cookiesJson = await fs.readFile(COOKIES_PATH, 'utf-8');
    return JSON.parse(cookiesJson);
  } catch (error) {
    console.log('No cookies found or error loading them:', error.message);
    return [];
  }
}

export async function clearCookies() {
  try {
    await fs.unlink(COOKIES_PATH);
    console.log('Cookies cleared.');
    return true;
  } catch (error) {
    console.log('Error clearing cookies:', error.message);
    return false;
  }
}

export async function initiateLoginProcess(options = {}) {
  const { headless = false, timeout = 0 } = options; // Default to visible browser for login
  let browser;
  try {
    browser = await launchBrowser({ headless }); // Use puppeteer-setup's launchBrowser
    const page = await browser.newPage();

    // Block navigation to non-zhipin sites to keep user focused
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.isNavigationRequest() && !req.url().includes('zhipin.com')) {
        req.abort('aborted').catch(e => console.log("Error aborting request:", e.message));
      } else {
        req.continue().catch(e => console.log("Error continuing request:", e.message));
      }
    });

    console.log('Navigating to Boss Zhipin login page...');
    await page.goto('https://www.zhipin.com/web/user/', { waitUntil: 'networkidle2', timeout });

    loginEventBus.emit('loginPageLoaded');
    console.log('Login page loaded. Please log in manually in the browser window.');

    // Wait for successful login. This is a simplified example.
    // A more robust check would be to wait for a specific URL or element indicating successful login.
    // Or wait for a specific cookie like 'wt2' or '__zp_stoken__'
    // For now, we'll rely on a timeout or a specific navigation event.
    // Example: wait for navigation to the homepage or a user dashboard after login.
    await page.waitForFunction(() => {
      return window.location.href.includes('www.zhipin.com') && !window.location.href.includes('/web/user/');
    }, { timeout: 300000 }); // 5 minutes timeout for manual login

    console.log('Login successful (detected by URL change).');
    const cookies = await page.cookies();
    await saveCookies(cookies);

    loginEventBus.emit('loginSuccess', cookies);

    await browser.close();
    return { success: true, message: 'Login successful, cookies saved.' };
  } catch (error) {
    console.error('Error during login process:', error);
    loginEventBus.emit('loginFailed', error);
    if (browser) {
      await browser.close();
    }
    throw new Error(`Login process failed: ${error.message}`);
  }
}
