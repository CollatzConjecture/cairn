import type { Page } from '@playwright/test';
import { expect } from '../fixtures';

/** The persisted store as the app last wrote it. */
export const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gr8r.v2') ?? '{}'));

/** Loads an app page and waits for the shell. */
export async function visit(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('link', { name: 'Inbox' }).first()).toBeVisible();
}

/** The page content, without the sidebar and topbar. */
export const main = (page: Page) => page.locator('#main-content');

/** The newest toast's text. */
export const toast = (page: Page, text: string | RegExp) => page.locator('[data-sonner-toast]').filter({ hasText: text }).first();
