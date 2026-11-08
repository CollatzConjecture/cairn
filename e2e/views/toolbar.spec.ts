import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

const rows = (page: Page) => page.getByRole('row').filter({ has: page.getByRole('button', { name: /^Status: / }) });
const row = (page: Page, title: string) => page.getByRole('row').filter({ hasText: title });
const firstInGroup = (page: Page, group: string) =>
  page
    .locator(`[data-task-row][data-group="${group}"]`)
    .first()
    .evaluate(r => [...r.querySelectorAll('button')].find(b => !b.hasAttribute('aria-label'))?.textContent ?? '');

test('search narrows the tasks and persists with the view', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await page.getByRole('textbox', { name: 'Search tasks' }).fill('hero');
  await expect(rows(page)).toHaveCount(1);
  await expect(row(page, 'Build hero component')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Search tasks' })).toHaveValue('hero');
  await expect(rows(page)).toHaveCount(1);
});

test('the filter builder adds a filter, its chip edits and removes it, and Clear all resets', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.getByText('No filters applied.')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Status', exact: true }).click();
  await page.getByRole('group', { name: 'Status values' }).getByRole('checkbox').nth(2).click();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByRole('button', { name: /^Filter/ })).toContainText('1');

  await page.getByRole('combobox', { name: 'Operator' }).click();
  await page.getByRole('option', { name: 'is not' }).click();
  await expect(rows(page)).toHaveCount(15);
  await page.keyboard.press('Escape');

  const chips = page.getByRole('group', { name: 'Active filters' });
  await expect(chips).toContainText('Status is not In Progress');
  await chips.getByRole('button', { name: /Status is not/ }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Done' }).click();
  await page.keyboard.press('Escape');
  await expect(chips).toContainText('Status is not In Progress, Done');
  await expect(rows(page)).toHaveCount(11);

  await page.reload();
  await expect(rows(page)).toHaveCount(11);
  await chips.getByRole('button', { name: 'Remove filter' }).click();
  await expect(chips).toBeHidden();
  await expect(rows(page)).toHaveCount(18);

  await page.getByRole('textbox', { name: 'Search tasks' }).fill('navigation');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Priority', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('group', { name: 'Active filters' }).getByRole('button', { name: 'Clear all' }).click();
  await expect(page.getByRole('textbox', { name: 'Search tasks' })).toHaveValue('');
  await expect(rows(page)).toHaveCount(18);
});

test('the sort menu orders the list and flips direction; the choice persists', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await page.getByRole('button', { name: 'Sort: Manual' }).click();
  await page.getByRole('menuitemradio', { name: 'Priority' }).click();
  await expect(page.getByRole('button', { name: 'Sort: Priority' })).toBeVisible();
  await expect.poll(() => firstInGroup(page, 'todo')).toBe('Prepare developer handoff');

  await page.getByRole('button', { name: 'Sort: Priority' }).click();
  await page.getByRole('button', { name: 'Descending' }).click();
  await page.keyboard.press('Escape');
  await expect.poll(() => firstInGroup(page, 'todo')).toBe('Weekly design sync notes');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Sort: Priority' })).toBeVisible();
  await expect.poll(() => firstInGroup(page, 'todo')).toBe('Weekly design sync notes');
});

test('the group menu regroups the list and No grouping flattens it', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await page.getByRole('button', { name: 'Group: Status' }).click();
  await page.getByRole('menuitemradio', { name: 'Assignee' }).click();
  await expect(page.getByRole('button', { name: 'Group: Assignee' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add task to Emma Wilson' })).toBeVisible();

  await page.getByRole('button', { name: 'Group: Assignee' }).click();
  await page.getByRole('menuitemradio', { name: 'No grouping' }).click();
  await expect(page.getByRole('button', { name: 'Toggle group' })).toHaveCount(0);
  await expect(rows(page)).toHaveCount(18);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Group: None' })).toBeVisible();
});

test('the columns menu shows and hides table columns and resets widths', async ({ page }) => {
  await page.goto('/projects/p1/table');
  const head = (name: string) => page.getByRole('columnheader', { name, exact: true });
  await expect(head('Labels')).toBeVisible();
  await expect(head('Start date')).toHaveCount(0);

  await page.getByRole('button', { name: 'Columns' }).click();
  await expect(page.getByRole('menuitemcheckbox', { name: 'Project' })).toHaveCount(0);
  await page.getByRole('menuitemcheckbox', { name: 'Labels' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Start date' }).click();
  await page.keyboard.press('Escape');
  await expect(head('Labels')).toHaveCount(0);
  await expect(head('Start date')).toBeVisible();

  await page.reload();
  await expect(head('Labels')).toHaveCount(0);
  await expect(head('Start date')).toBeVisible();
});
