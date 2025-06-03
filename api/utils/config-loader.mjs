import fs from 'node:fs/promises';
import path from 'node:path';
import JSON5 from 'json5';

const CONFIG_DIR = path.join(process.cwd(), 'config'); // process.cwd() will be /app/api when running the server
const STORAGE_DIR = path.join(process.cwd(), 'storage'); // process.cwd() will be /app/api

// Generic function to read a config file from api/config
export async function readAppConfigFile(fileName) {
  const filePath = path.join(CONFIG_DIR, fileName);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON5.parse(fileContent);
  } catch (error) {
    console.error(`Error reading or parsing config file ${fileName} from ${CONFIG_DIR}:`, error.message);
    // Return null or throw, depending on how critical the config is
    return null;
  }
}

// Generic function to read a storage file from api/storage
export async function readAppStorageFile(fileName) {
  const filePath = path.join(STORAGE_DIR, fileName);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON5.parse(fileContent); // Use JSON5 in case these also have comments/etc.
  } catch (error) {
    console.warn(`Warning: Error reading or parsing storage file ${fileName} from ${STORAGE_DIR}:`, error.message);
    return null;
  }
}

// Specific loader functions for commonly used configs (optional, but can be convenient)
export async function getBossConfig() {
  return await readAppConfigFile('boss.json');
}

export async function getTargetCompanyList() {
  return await readAppConfigFile('target-company-list.json');
}

export async function getJobFilterConditions() {
  return await readAppConfigFile('job-filter-conditions.json');
}

export async function getJobFilterIndustryFilterExemption() {
  return await readAppConfigFile('job-filter-industry-filter-exemption.json');
}

// Example for a storage file
export async function getBossLocalStorage() {
    return await readAppStorageFile('boss-local-storage.json');
}
