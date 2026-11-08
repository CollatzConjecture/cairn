import type { Page } from '@playwright/test';
import { expect } from '../fixtures';

/** The persisted store as the app last wrote it. */
export const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gr8r.v2') ?? '{}'));

/** Loads an app page and waits for the shell, so global shortcuts are listening. */
export async function visit(page: Page, path = '/home') {
  await page.goto(path);
  await expect(page.getByRole('link', { name: 'Inbox' }).first()).toBeVisible();
}

/** Opens "Triage beta tester feedback" from Home's My tasks and returns the drawer. */
export async function openDrawer(page: Page, title = 'Triage beta tester feedback') {
  await visit(page);
  await page.getByRole('button', { name: title, exact: true }).first().click();
  const drawer = page.getByRole('dialog', { name: `Task: ${title}` });
  await expect(drawer).toBeVisible();
  return drawer;
}

type Store = typeof import('../../src/store');
/** Calls a store action in the page without awaiting what it returns, to drive an overlay directly (a bare `prompt()`). Vite serves the app's
    own module instance, so this is the same store the app renders. `run` is serialized: it cannot close over test variables. */
export async function act(page: Page, run: (s: Store) => unknown) {
  await page.evaluate(`import('/src/store/index.ts').then(s => { (${run.toString()})(s); })`);
}

/** Opens a Website Redesign task from the project's list view (its rows are stable seed data). */
export async function openFromList(page: Page, title: string) {
  await visit(page, '/projects/p1/list');
  await page.getByRole('row').filter({ hasText: title }).getByRole('button', { name: title, exact: true }).click();
  const drawer = page.getByRole('dialog', { name: `Task: ${title}` });
  await expect(drawer).toBeVisible();
  return drawer;
}
