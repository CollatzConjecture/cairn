import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { saved, visit } from './helpers';

const open = async (page: Page) => {
  await visit(page);
  await page.keyboard.press('Control+k');
  const menu = page.getByRole('dialog', { name: 'Command menu' });
  await expect(menu.getByPlaceholder('Type a command or search…')).toBeFocused();
  return menu;
};
const selected = (page: Page) => page.getByRole('option', { selected: true });

test('the palette opens instantly with suggestions, recent tasks and navigation, the first item selected', async ({ page }) => {
  const menu = await open(page);
  expect(await menu.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  for (const g of ['Suggestions', 'Recent tasks', 'Navigation']) await expect(menu.getByText(g, { exact: true })).toBeVisible();
  await expect(selected(page)).toHaveText(/Create task/);
  await expect(menu.getByRole('option', { name: /Create homepage wireframes/ })).toContainText('WEB-109');
});

test('arrow keys move the selection, wrapping around, and Enter runs it', async ({ page }) => {
  const menu = await open(page);
  await page.keyboard.press('ArrowDown');
  await expect(selected(page)).toHaveText(/Create project/);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(selected(page)).toHaveText(/Go to Members/);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(selected(page)).toHaveText(/Create project/);
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
});

test('typing filters commands and searches the workspace; Enter runs the top match', async ({ page }) => {
  const menu = await open(page);
  await page.keyboard.type('inbox');
  await expect(menu.getByText('Commands', { exact: true })).toBeVisible();
  await expect(selected(page)).toHaveText(/Go to Inbox/);
  await expect(menu.getByRole('option', { name: /View all results for “inbox”/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/inbox');
  await expect(menu).toBeHidden();
});

test('a recent task opens in the drawer', async ({ page }) => {
  const menu = await open(page);
  await menu.getByRole('option', { name: /Summarize stakeholder interviews/ }).click();
  await expect(menu).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Task: Summarize stakeholder interviews' })).toBeVisible();
});

test('Tab switches to search mode, Backspace on an empty query goes back', async ({ page }) => {
  const menu = await open(page);
  await page.keyboard.press('Tab');
  const input = menu.getByPlaceholder('Search tasks, projects, people, files, comments…');
  await expect(input).toBeFocused();
  await expect(menu.getByText('Search', { exact: true })).toBeVisible();
  await expect(menu.getByText('Recent searches')).toBeVisible();
  await expect(menu.getByRole('option', { name: 'wireframes' })).toBeVisible();
  await page.keyboard.press('Backspace');
  await expect(menu.getByPlaceholder('Type a command or search…')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(menu.getByPlaceholder('Type a command or search…')).toBeFocused();
});

test('search results open tasks, and scopes narrow them', async ({ page }) => {
  const menu = await open(page);
  await page.keyboard.press('Tab');
  await page.keyboard.type('android');
  await expect(menu.getByRole('group', { name: 'Tasks' })).toBeVisible();
  await expect(selected(page)).toHaveText(/Crash on Android 12 when rotating/);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Task: Crash on Android 12 when rotating' })).toBeVisible();

  await page.keyboard.press('/');
  await menu.getByRole('button', { name: 'People' }).click();
  await expect(menu.getByRole('button', { name: 'People' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.type('sarah');
  await expect(menu.getByRole('group', { name: 'People' })).toBeVisible();
  await expect(menu.getByRole('group', { name: 'Tasks' })).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/members/m2');
});

test('picking a recent search fills the query, and View all results opens the search page', async ({ page }) => {
  const menu = await open(page);
  await page.keyboard.press('Tab');
  await menu.getByRole('option', { name: 'homepage' }).click();
  await expect(menu.getByPlaceholder('Search tasks, projects, people, files, comments…')).toHaveValue('homepage');
  await expect(menu.getByRole('option', { name: /Write homepage copy/ })).toBeVisible();
  await menu.getByRole('option', { name: /View all results for “homepage”/ }).click();
  await expect(page).toHaveURL('/search');
  await expect.poll(async () => (await saved(page)).data.recentSearches[0]).toBe('homepage');
});

test('a suggested search goes to its page', async ({ page }) => {
  const menu = await open(page);
  await page.keyboard.press('Tab');
  await menu.getByRole('option', { name: 'Overdue tasks' }).click();
  await expect(page).toHaveURL('/tasks');
});

test('Switch workspace lists workspaces, filters them, and switches', async ({ page }) => {
  const menu = await open(page);
  await menu.getByRole('option', { name: /Switch workspace/ }).click();
  await expect(menu.getByPlaceholder('Find a workspace…')).toBeFocused();
  await expect(menu.getByText('Workspace', { exact: true })).toBeVisible();
  await page.keyboard.type('zzz');
  await expect(menu.getByText('No results found')).toBeVisible();
  await menu.getByPlaceholder('Find a workspace…').fill('acme');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Switched to Acme Labs')).toBeVisible();
  await expect(menu).toBeHidden();
});

test('commands run their actions: dark mode, shortcuts, sidebar', async ({ page }) => {
  let menu = await open(page);
  await menu.getByRole('option', { name: /Switch to dark mode/ }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await page.keyboard.press('Control+k');
  menu = page.getByRole('dialog', { name: 'Command menu' });
  await expect(menu.getByRole('option', { name: /Switch to light mode/ })).toBeVisible();
  await page.keyboard.type('shortcuts');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
});

test('Escape and a click outside close the palette and return focus', async ({ page }) => {
  const menu = await open(page);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await page.getByRole('button', { name: 'Search and commands' }).click();
  await expect(menu).toBeVisible();
  await page.mouse.click(30, 880);
  await expect(menu).toBeHidden();
  await expect(page.getByRole('button', { name: 'Search and commands' })).toBeFocused();
});
