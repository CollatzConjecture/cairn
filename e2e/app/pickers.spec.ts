import { expect, test } from '../fixtures';

/** The Website Redesign list renders the shared TaskList, grouped by status. */
const row = (page: import('@playwright/test').Page, title: string) => page.getByRole('row').filter({ hasText: title });

test('the status picker changes a task, closes, and the change persists', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await row(page, 'Write homepage copy').getByRole('button', { name: 'Status: Backlog' }).click();
  await page.getByRole('menuitemradio', { name: 'In Progress' }).click();

  await expect(page.getByRole('menu')).toBeHidden();
  await expect(row(page, 'Write homepage copy').getByRole('button', { name: 'Status: In Progress' })).toBeVisible();

  await page.reload();
  await expect(row(page, 'Write homepage copy').getByRole('button', { name: 'Status: In Progress' })).toBeVisible();
});

test('number keys pick a status while the picker is open, and focus returns to the trigger', async ({ page }) => {
  await page.goto('/projects/p1/list');
  const priority = row(page, 'Set up analytics events').getByRole('button', { name: 'Priority: Medium' });
  await priority.click();
  await page.getByRole('menuitemradio', { name: 'Urgent' }).click();
  const urgent = row(page, 'Set up analytics events').getByRole('button', { name: 'Priority: Urgent' });
  await expect(urgent).toBeFocused();

  await row(page, 'Set up analytics events').getByRole('button', { name: 'Status: Backlog' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('5');
  await expect(row(page, 'Set up analytics events').getByRole('button', { name: 'Status: Done' })).toBeVisible();
});

test('the assignee picker filters members as you type', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await row(page, 'Write homepage copy').getByRole('button', { name: 'Assignee: Priya Patel' }).click();
  await page.getByRole('combobox', { name: 'Assign to…' }).fill('lena');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(row(page, 'Write homepage copy').getByRole('button', { name: 'Assignee: Lena Fischer' })).toBeVisible();
});

test('the labels picker toggles several labels without closing', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await row(page, 'Write homepage copy').getByRole('button', { name: 'Labels' }).click();
  await page.getByRole('option', { name: 'Bug' }).click();
  await page.getByRole('option', { name: 'QA' }).click();
  await page.keyboard.press('Escape');
  await expect(row(page, 'Write homepage copy').getByRole('button', { name: 'Labels' })).toContainText('Content');
  await expect(row(page, 'Write homepage copy').getByRole('button', { name: 'Labels' })).toContainText('+1');
});
