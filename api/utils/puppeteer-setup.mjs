import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

let puppeteerInitialized = false;

export async function initPuppeteer() {
  if (puppeteerInitialized) {
    return { puppeteer };
  }
  // Apply stealth plugin
  puppeteer.use(StealthPlugin());
  puppeteerInitialized = true;
  console.log("Puppeteer initialized with Stealth Plugin");
  return { puppeteer };
}

export async function launchBrowser(options = {}) {
  await initPuppeteer(); // Ensure puppeteer is initialized

  const defaultOptions = {
    headless: true, // Default to headless for API
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
  };

  const launchOptions = { ...defaultOptions, ...options };
  console.log("Launching browser with options:", launchOptions);
  const browser = await puppeteer.launch(launchOptions);
  return browser;
}
