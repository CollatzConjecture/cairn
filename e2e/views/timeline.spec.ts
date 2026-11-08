import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { drag, keyboardDrag } from './helpers';

const grid = (page: Page) => page.getByRole('group', { name: 'Timeline' });
const bar = (page: Page, title: string) => grid(page).getByRole('button', { name: title, exact: true });

test('zoom switches between days and weeks, and grouping regroups the rows', async ({ page }) => {
  await page.goto('/projects/p1/timeline');
  await expect(page.getByText('Oct 5', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Months' }).click();
  await expect(page.getByText('Oct 5', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Weeks' }).click();
  await expect(page.getByText('Oct 5', { exact: true })).toHaveCount(0);

  await page.getByRole('combobox', { name: 'Group by' }).click();
  await page.getByRole('option', { name: 'Group: Assignee' }).click();
  await expect(page.getByText(/Emma Wilson\s*\d+$/)).toBeVisible();
  await page.getByRole('combobox', { name: 'Group by' }).click();
  await page.getByRole('option', { name: 'No grouping' }).click();
  await expect(page.getByText(/Emma Wilson\s*\d+$/)).toHaveCount(0);
  await expect(page.getByText('Backlog', { exact: true })).toHaveCount(0);
});

test('Today scrolls the timeline back to today', async ({ page }) => {
  await page.goto('/projects/p1/timeline');
  const scroller = page.locator('#tl-right');
  await expect.poll(() => scroller.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
  await scroller.evaluate(e => (e.scrollLeft = 0));
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect.poll(() => scroller.evaluate(e => e.scrollLeft)).toBeGreaterThan(400);
});

test('dragging a bar moves the task by whole days, and resizing its end changes the due date', async ({ page }) => {
  await page.goto('/projects/p1/timeline');
  const b = bar(page, 'Weekly design sync notes');
  await expect(b).toHaveAttribute('title', 'Weekly design sync notes · Oct 5 → Oct 9');
  const box = await b.boundingBox();
  if (!box) throw new Error('bar not visible');
  await drag(page, b, { x: box.x + box.width / 2 + 64, y: box.y + box.height / 2 });
  await expect(page.getByText('Moved “Weekly design sync notes” 2 days later')).toBeVisible();
  await expect(b).toHaveAttribute('title', 'Weekly design sync notes · Oct 7 → Oct 11');

  const end = grid(page).getByRole('button', { name: /^Due date of Weekly design sync notes/ });
  const e = await end.boundingBox();
  if (!e) throw new Error('resize handle not visible');
  await drag(page, end, { x: e.x + e.width / 2 + 96, y: e.y + e.height / 2 });
  await expect(page.getByText('“Weekly design sync notes” now due Oct 14')).toBeVisible();

  await page.reload();
  await expect(bar(page, 'Weekly design sync notes')).toHaveAttribute('title', 'Weekly design sync notes · Oct 7 → Oct 14');
});

test('a bar moves a day from the keyboard', async ({ page }) => {
  await page.goto('/projects/p1/timeline');
  await bar(page, 'Build hero component').focus();
  await keyboardDrag(page, ['ArrowRight']);
  await expect(page.getByText('Moved “Build hero component” 1 day later')).toBeVisible();
});

test('clicking a bar opens its task', async ({ page }) => {
  await page.goto('/projects/p1/timeline');
  await bar(page, 'Review responsive layouts').click();
  await expect(page.getByRole('dialog').getByText('Review responsive layouts').first()).toBeVisible();
});

test('the workspace timeline groups by project and shows every project’s milestones', async ({ page }) => {
  await page.goto('/timeline');
  await expect(page.getByRole('heading', { name: 'Timeline', level: 1 })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Group by' })).toContainText('Group: Project');
  await expect(page.getByText(/^Milestones\s*\d+$/)).toBeVisible();
  await expect(page.getByText(/^Website Redesign\s*18$/)).toBeVisible();
});
