import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

const row = (page: Page, title: string) => page.getByRole('row').filter({ hasText: title });
/** Row titles of one list group, top to bottom. */
const groupTitles = (page: Page, group: string) =>
  page
    .locator(`[data-task-row][data-group="${group}"]`)
    .evaluateAll(rows => rows.map(r => [...r.querySelectorAll('button')].find(b => !b.hasAttribute('aria-label'))?.textContent ?? ''));

async function dragRow(page: Page, title: string, onto: string, half: 'top' | 'bottom') {
  const target = row(page, onto);
  const box = await target.boundingBox();
  if (!box) throw new Error('target row not visible');
  await row(page, title).hover();
  await row(page, title)
    .locator('[data-drag-row]')
    .dragTo(target, { targetPosition: { x: box.width / 2, y: half === 'top' ? 6 : box.height - 6 } });
}

test('dragging a row by its handle reorders the list, and the order persists', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await dragRow(page, 'Migrate blog to new CMS', 'Write homepage copy', 'top');
  await expect
    .poll(() => groupTitles(page, 'backlog'))
    .toEqual(['Migrate blog to new CMS', 'Write homepage copy', 'Set up analytics events', 'Accessibility audit of templates']);
  await page.reload();
  await expect
    .poll(() => groupTitles(page, 'backlog'))
    .toEqual(['Migrate blog to new CMS', 'Write homepage copy', 'Set up analytics events', 'Accessibility audit of templates']);
});

test('dropping a row into another group takes on that group, and a sorted view switches to manual', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await page.getByRole('button', { name: 'Sort: Manual' }).click();
  await page.getByRole('menuitemradio', { name: 'Title' }).click();
  await expect(page.getByRole('button', { name: 'Sort: Title' })).toBeVisible();

  await dragRow(page, 'Write homepage copy', 'Build hero component', 'bottom');
  await expect(row(page, 'Write homepage copy').getByRole('button', { name: 'Status: To Do' })).toBeVisible();
  await expect(page.getByText('Sorted manually to keep your order')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sort: Manual' })).toBeVisible();

  await page.reload();
  await expect(row(page, 'Write homepage copy').getByRole('button', { name: 'Status: To Do' })).toBeVisible();
});

test('Alt+Arrow keys move the focused row, across a group boundary, keeping focus on it', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await row(page, 'Set up analytics events').getByRole('button', { name: 'Set up analytics events', exact: true }).focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect
    .poll(() => groupTitles(page, 'backlog'))
    .toEqual(['Set up analytics events', 'Write homepage copy', 'Accessibility audit of templates', 'Migrate blog to new CMS']);
  await expect(page.getByRole('button', { name: 'Set up analytics events', exact: true })).toBeFocused();

  await row(page, 'Migrate blog to new CMS').getByRole('button', { name: 'Migrate blog to new CMS', exact: true }).focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(row(page, 'Migrate blog to new CMS').getByRole('button', { name: 'Status: To Do' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Migrate blog to new CMS', exact: true })).toBeFocused();
});

test('changing status from the list keeps focus on the moved row', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await row(page, 'Accessibility audit of templates').getByRole('button', { name: 'Status: Backlog' }).click();
  await page.getByRole('menuitemradio', { name: 'Review' }).click();
  const moved = row(page, 'Accessibility audit of templates').getByRole('button', { name: 'Status: Review' });
  await expect(moved).toBeVisible();
  await expect(moved).toBeFocused();
});

test('the list composer adds a task to its group', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await page.getByRole('button', { name: 'Add task to In Progress' }).click();
  const box = page.getByRole('textbox', { name: 'New task name' });
  await box.fill('Wire up search');
  await box.press('Enter');
  await expect(row(page, 'Wire up search').getByRole('button', { name: 'Status: In Progress' })).toBeVisible();
});
