import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

export async function launchBrowser() {
  const paths = [
    process.env.CHROME_PATH,
    `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1217/chrome-win64/chrome.exe`,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ].filter(Boolean);
  const executablePath = paths.find(p => existsSync(p));
  return chromium.launch({ executablePath, headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
}

export const origin = process.env.GAME_URL || 'http://127.0.0.1:5188';
