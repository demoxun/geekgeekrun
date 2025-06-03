import { launchBrowser } from '../utils/puppeteer-setup.mjs';
import { loadCookies, saveCookies } from './auth-service.mjs'; // For session management
// import fs from 'node:fs/promises'; // fs might still be needed for other things, or remove if not
// import path from 'node:path'; // path might still be needed

// Import config loading utilities
import {
  getBossConfig,
  getJobFilterConditions,
  getTargetCompanyList,
  getJobFilterIndustryFilterExemption,
  getBossLocalStorage
} from '../utils/config-loader.mjs';

// --- Global service-level configurations (loaded once) ---
let bossConfig = {};
let jobFilterConditions = {};
let targetCompanyList = [];
let jobFilterIndustryExemption = {};
let bossLocalStorage = {}; // For local storage content

(async () => {
  try {
    bossConfig = await getBossConfig() || { anyCombineRecommendJobFilter: [], expectJobRegExpStr: '', jobNotMatchStrategy: 'NO_OP', expectCityNotMatchStrategy: 'NO_OP', expectCityList: [] };
    jobFilterConditions = await getJobFilterConditions() || {};
    targetCompanyList = await getTargetCompanyList() || [];
    jobFilterIndustryExemption = await getJobFilterIndustryFilterExemption() || {};
    bossLocalStorage = await getBossLocalStorage() || {}; // Load local storage data

    console.log("Job service configurations loaded via config-loader.");
    // console.log("Boss Config:", JSON.stringify(bossConfig, null, 2));
    // console.log("Target Companies:", targetCompanyList.length);
  } catch (error) {
    console.error("Failed to load configurations for JobService:", error);
  }
})();

// --- Re-implement or adapt utility functions ---
// (Old readConfigFile and its direct usage should be removed by the grep commands above)


// --- Core Job Functions (to be adapted from original codebase) ---
async function setFilterCondition(page, selectedFilters) {
  console.log('Setting filter conditions (placeholder):', selectedFilters);
  if (!page) throw new Error("Puppeteer page object is required for setFilterCondition.");
  await page.waitForTimeout(1000);
  console.log("Filters would have been applied here.");
  return true;
}

function testIfJobTitleOrDescriptionSuit(jobInfo, config) {
  console.log('Testing job suitability (placeholder):', jobInfo.jobName);
  return true;
}

// --- Main Service Functions ---
export async function getRecommendedJobs(filters = {}, pagination = { page: 1, pageSize: 10 }) {
  let browser;
  try {
    const cookies = await loadCookies();
    if (!cookies || cookies.length === 0) {
      throw new Error('Not logged in. Please login first.');
    }

    browser = await launchBrowser({ headless: true });
    const page = await browser.newPage();
    await page.setCookie(...cookies);

    console.log('Navigating to Boss Zhipin recommend jobs page...');
    await page.goto('https://www.zhipin.com/web/geek/jobs', { waitUntil: 'networkidle2', timeout: 60000 });

    if (page.url().includes('/web/user/')) {
        await browser.close();
        throw new Error('Login required or cookies invalid. Redirected to login page.');
    }

    console.log('On recommend jobs page.');

    if (Object.keys(filters).length > 0) {
      console.log("Placeholder: Filters would be applied here if `setFilterCondition` was fully implemented.");
      // Simulate network activity after applying filters
      // await page.waitForResponse(response => response.url().includes('/recommend/job/list.json'), { timeout: 30000 });
      await page.waitForTimeout(2000); // Generic wait
      console.log("Pretended to wait for filter results.");
    }

    await page.waitForSelector('.job-list-box .job-card-wrapper', { timeout: 30000 });

    const jobs = await page.evaluate(() => {
      const jobCards = Array.from(document.querySelectorAll('.job-list-box .job-card-wrapper'));
      return jobCards.map(card => {
        const jobName = card.querySelector('.job-name')?.innerText.trim();
        const companyName = card.querySelector('.company-name')?.innerText.trim();
        const salary = card.querySelector('.salary')?.innerText.trim();
        const jobId = card.getAttribute('data-job-id');
        const bossName = card.querySelector('.boss-name')?.innerText.trim();
        return { jobId, jobName, companyName, salary, bossName };
      }).filter(job => job.jobId || (job.jobName && job.companyName));
    });

    await browser.close();
    return { jobs, page: pagination.page, totalPages: Math.ceil(jobs.length / pagination.pageSize) };

  } catch (error) {
    console.error('Error in getRecommendedJobs:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

export async function searchJobs(searchCriteria) {
  console.log('Searching jobs with criteria (placeholder):', searchCriteria);
  return { jobs: [], message: "Search functionality is a placeholder." };
}


// --- Chat Initiation Function ---
export async function startChatWithBoss(jobId, encryptBossId, greeting) {
  let browser;
  try {
    const cookies = await loadCookies();
    if (!cookies || cookies.length === 0) {
      throw new Error('Not logged in. Please login first.');
    }

    // For starting a chat, we typically need to be on a job's detail page or a similar context
    // where the "start chat" button is available and correctly refers to the job/boss.
    // The original script clicks this from a job detail view within the recommend list.
    // This function will simulate that. A more direct API call might be possible but harder to reverse-engineer.

    console.log(`Attempting to start chat for jobId: ${jobId}, encryptBossId: ${encryptBossId}`);

    browser = await launchBrowser({ headless: true }); // Or false for debugging
    const page = await browser.newPage();
    await page.setCookie(...cookies);

    // Navigate to a job page. The URL structure needs to be known.
    // Example: https://www.zhipin.com/job_detail/{jobId}.html - this is a guess.
    // The original script gets job details via an XHR: 'https://www.zhipin.com/wapi/zpgeek/job/detail.json'
    // and then clicks a button on the current page.
    // For an API, we might need to navigate to the job's web page first if a direct API call for chat is not available/known.
    // Let's assume we need to go to the job page from which one can chat.
    // This is a placeholder URL structure.
    const jobPageUrl = `https://www.zhipin.com/web/geek/job/${jobId}`; // This URL is hypothetical

    console.log(`Navigating to job page: ${jobPageUrl}`);
    await page.goto(jobPageUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Handle potential immediate redirects (e.g., to login if cookies are invalid)
    if (page.url().includes('/web/user/') || !page.url().includes(jobId)) {
        await browser.close();
        throw new Error(`Login required or cookies invalid, or job page not found. Redirected from ${jobPageUrl} to ${page.url()}`);
    }

    // Placeholder for clicking the "立即沟通" (Start Chat) button
    // Selectors would need to be identified from the actual job page.
    // const chatButtonSelector = '.op-btn.op-btn-chat'; // Example from original script's context
    // await page.waitForSelector(chatButtonSelector, { timeout: 10000 });
    // await page.click(chatButtonSelector);

    console.log("Placeholder: 'Start Chat' button would be clicked here.");

    // Placeholder for waiting for the 'friend/add.json' response
    // const chatApiResponse = await page.waitForResponse(
    //   response => response.url().startsWith('https://www.zhipin.com/wapi/zpgeek/friend/add.json') &&
    //               response.request().method() === 'POST' &&
    //               (response.request().postData() || '').includes(jobId), // Ensure it's for the correct job
    //   { timeout: 30000 }
    // );
    // const responseJson = await chatApiResponse.json();
    // console.log('Chat initiation API response:', responseJson);

    // if (responseJson.code !== 0) {
    //   // Handle specific error codes, e.g., chat limit
    //   const errorDetail = responseJson.zpData?.bizData?.chatRemindDialog?.content || responseJson.message || 'Unknown error from Boss Zhipin';
    //   throw new Error(`Failed to start chat: ${errorDetail} (Code: ${responseJson.code}, BizCode: ${responseJson.zpData?.bizCode})`);
    // }

    // Placeholder for handling greeting dialog if necessary
    // await page.waitForTimeout(1000); // Allow time for dialogs
    // const closeDialogButtonSelector = '.greet-boss-dialog .cancel-btn'; // Example
    // if (await page.$(closeDialogButtonSelector)) {
    //   await page.click(closeDialogButtonSelector);
    //   console.log("Closed greeting dialog.");
    // }

    // Simulate success for placeholder
    const simulatedResponse = {
        code: 0,
        message: "Chat started successfully (simulated).",
        zpData: { bizCode: 0 }
    };

    await browser.close();
    // return { success: true, message: 'Chat started successfully.', details: responseJson };
    return { success: true, message: 'Chat started successfully (simulated).', details: simulatedResponse };


  } catch (error) {
    console.error('Error in startChatWithBoss:', error);
    if (browser) {
      await browser.close();
    }
    throw error; // Re-throw to be caught by API endpoint handler
  }
}
