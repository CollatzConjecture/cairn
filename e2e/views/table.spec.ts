import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { drag, keyboardDrag } from './helpers';

const table = (page: Page) => page.getByRole('table', { name: 'Tasks table' });
const row = (page: Page, title: string) => table(page).getByRole('row').filter({ hasText: title });
const titleCell = (page: Page, title: string) => row(page, title).getByRole('button', { name: new RegExp(`^${title}`) });

test('double-clicking a title edits it in place; Enter saves and Escape cancels', async ({ page }) => {
  await page.goto('/projects/p1/table');
  await titleCell(page, 'Build hero component').dblclick();
  const input = page.getByRole('textbox', { name: 'Title' });
  await input.fill('Build hero section');
  await input.press('Enter');
  await expect(titleCell(page, 'Build hero section')).toBeVisible();

  await titleCell(page, 'Build hero section').dblclick();
  await page.getByRole('textbox', { name: 'Title' }).fill('Something else');
  await page.getByRole('textbox', { name: 'Title' }).press('Escape');
  await expect(page.getByRole('textbox', { name: 'Title' })).toBeHidden();
  await expect(titleCell(page, 'Build hero section')).toBeVisible();

  await page.reload();
  await expect(titleCell(page, 'Build hero section')).toBeVisible();
});

test('the estimate cell edits in place and clears when emptied', async ({ page }) => {
  await page.goto('/projects/p1/table');
  await row(page, 'Write homepage copy').getByRole('button', { name: 'Estimate: 2d' }).click();
  const input = page.getByRole('textbox', { name: 'Estimate' });
  await input.fill('5d');
  await input.press('Enter');
  await expect(row(page, 'Write homepage copy').getByRole('button', { name: 'Estimate: 5d' })).toBeVisible();

  await row(page, 'Write homepage copy').getByRole('button', { name: 'Estimate: 5d' }).click();
  await page.getByRole('textbox', { name: 'Estimate' }).fill('');
  await page.getByRole('textbox', { name: 'Estimate' }).blur();
  await expect(row(page, 'Write homepage copy').getByRole('button', { name: 'Estimate: none' })).toBeVisible();
});

test('cell pickers change a task, and the row moves to its new group', async ({ page }) => {
  await page.goto('/projects/p1/table');
  await row(page, 'Migrate blog to new CMS').getByRole('button', { name: 'Status: Backlog' }).click();
  await page.getByRole('menuitemradio', { name: 'Review' }).click();
  await expect(row(page, 'Migrate blog to new CMS').getByRole('button', { name: 'Status: Review' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: /^Review\s*3$/ })).toBeVisible();
});

test('clicking a header sorts by that column and again flips the direction', async ({ page }) => {
  await page.goto('/projects/p1/table');
  await page.getByRole('button', { name: 'Group: Status' }).click();
  await page.getByRole('menuitemradio', { name: 'No grouping' }).click();
  await table(page).getByRole('button', { name: 'Task', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sort: Title' })).toBeVisible();
  const firstTitle = () => table(page).locator('tbody tr').first().getByRole('button').first().innerText();
  await expect.poll(firstTitle).toMatch(/^Accessibility audit of templates/);
  await table(page).getByRole('button', { name: 'Task', exact: true }).click();
  await expect.poll(firstTitle).toMatch(/^Write homepage copy/);
});

test('dragging a column edge resizes it, the width persists, and the keyboard resizes too', async ({ page }) => {
  await page.goto('/projects/p1/table');
  const edge = page.getByRole('separator', { name: 'Resize Priority column' });
  await expect(edge).toHaveAttribute('aria-valuenow', '112');
  const box = await edge.boundingBox();
  if (!box) throw new Error('resize handle not visible');
  await drag(page, edge, { x: box.x + box.width / 2 + 80, y: box.y + box.height / 2 });
  await expect(edge).toHaveAttribute('aria-valuenow', '192');

  await page.reload();
  await expect(edge).toHaveAttribute('aria-valuenow', '192');

  await edge.focus();
  await keyboardDrag(page, ['ArrowLeft', 'ArrowLeft']);
  await expect(edge).toHaveAttribute('aria-valuenow', '142');

  await page.getByRole('button', { name: 'Columns' }).click();
  await page.getByRole('menuitem', { name: 'Reset widths' }).click();
  await expect(edge).toHaveAttribute('aria-valuenow', '112');
});

test('phones get a card per task that opens the task', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects/p1/table');
  await expect(table(page)).toBeHidden();
  await page.getByRole('button', { name: 'Finalize navigation', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Finalize navigation').first()).toBeVisible();
});
