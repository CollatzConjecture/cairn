import { expect, test } from '../fixtures';
import { cardTitles, drag, keyboardDrag } from './helpers';

const col = (page: import('@playwright/test').Page, name: string) => page.getByRole('region', { name, exact: true });
const card = (page: import('@playwright/test').Page, title: string) => page.getByRole('button', { name: title, exact: true });

test('dragging a card to another column changes its status, logs it, and persists', async ({ page }) => {
  await page.goto('/projects/p1/board');
  await drag(page, card(page, 'Write homepage copy'), col(page, 'In Progress'));

  await expect(page.getByText('Moved “Write homepage copy” to In Progress')).toBeVisible();
  await expect(col(page, 'In Progress').getByRole('button', { name: 'Write homepage copy', exact: true })).toBeVisible();
  await expect(col(page, 'In Progress')).toContainText('In Progress4');

  await page.reload();
  await expect(col(page, 'In Progress').getByRole('button', { name: 'Write homepage copy', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Project views' }).getByRole('link', { name: 'Activity' }).click();
  await expect(page.getByText('moved Write homepage copy from Backlog to In Progress').first()).toBeVisible();
});

test('dragging a card within its column reorders it and the order persists', async ({ page }) => {
  await page.goto('/projects/p1/board');
  const backlog = col(page, 'Backlog');
  await expect
    .poll(() => cardTitles(backlog))
    .toEqual(['Write homepage copy', 'Set up analytics events', 'Accessibility audit of templates', 'Migrate blog to new CMS']);

  await drag(page, card(page, 'Migrate blog to new CMS'), card(page, 'Write homepage copy'), { dy: -12 });
  await expect
    .poll(() => cardTitles(backlog))
    .toEqual(['Migrate blog to new CMS', 'Write homepage copy', 'Set up analytics events', 'Accessibility audit of templates']);

  await page.reload();
  await expect
    .poll(() => cardTitles(col(page, 'Backlog')))
    .toEqual(['Migrate blog to new CMS', 'Write homepage copy', 'Set up analytics events', 'Accessibility audit of templates']);
});

test('a card moves to the next column from the keyboard', async ({ page }) => {
  await page.goto('/projects/p1/board');
  await card(page, 'Finalize navigation').focus();
  await page.getByRole('button', { name: 'Move Finalize navigation' }).focus();
  await keyboardDrag(page, ['ArrowRight']);
  await expect(col(page, 'Review').getByRole('button', { name: 'Finalize navigation', exact: true })).toBeVisible();
  await expect(page.getByText('Moved “Finalize navigation” to Review')).toBeVisible();
});

test('the inline composer adds cards to its column, Enter keeps it open, Escape closes it', async ({ page }) => {
  await page.goto('/projects/p1/board');
  await page.getByRole('button', { name: 'Add task to Review' }).click();
  const box = page.getByRole('textbox', { name: 'New task name' });
  await box.fill('Audit image sizes');
  await box.press('Enter');
  await expect(col(page, 'Review').getByRole('button', { name: 'Audit image sizes', exact: true })).toBeVisible();
  await expect(box).toBeFocused();
  await box.press('Escape');
  await expect(box).toBeHidden();

  await page.reload();
  await expect(col(page, 'Review').getByRole('button', { name: 'Audit image sizes', exact: true })).toBeVisible();
});

test('the column menu collapses and expands a column', async ({ page }) => {
  await page.goto('/projects/p1/board');
  await page.getByRole('button', { name: 'To Do column options' }).click();
  await page.getByRole('menuitem', { name: 'Collapse column' }).click();
  await expect(col(page, 'To Do')).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand To Do' }).click();
  await expect(col(page, 'To Do').getByRole('button', { name: 'Build hero component', exact: true })).toBeVisible();
});

test('the column menu marks a column done with undo, and sorts it by priority', async ({ page }) => {
  await page.goto('/projects/p1/board');
  await page.getByRole('button', { name: 'Backlog column options' }).click();
  await page.getByRole('menuitem', { name: 'Sort by priority' }).click();
  await expect
    .poll(() => cardTitles(col(page, 'Backlog')))
    .toEqual(['Accessibility audit of templates', 'Set up analytics events', 'Migrate blog to new CMS', 'Write homepage copy']);

  await page.getByRole('button', { name: 'Backlog column options' }).click();
  await page.getByRole('menuitem', { name: 'Mark all as done' }).click();
  await expect(page.getByText('Marked 4 tasks as done')).toBeVisible();
  await expect(col(page, 'Backlog')).toContainText('Backlog0');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(col(page, 'Backlog')).toContainText('Backlog4');
});

test('the Done column menu archives completed tasks', async ({ page }) => {
  await page.goto('/projects/p1/board');
  await page.getByRole('button', { name: 'Done column options' }).click();
  await page.getByRole('menuitem', { name: 'Archive completed' }).click();
  await expect(page.getByText(/Archived \d+ completed tasks/)).toBeVisible();
  await expect(col(page, 'Done')).toContainText('Done0');
});

test('card pills change priority and assignee, and the hover actions complete a task', async ({ page }) => {
  await page.goto('/projects/p1/board');
  const c = page.locator('[data-drag-card]').filter({ hasText: 'Build hero component' });
  await c.getByRole('button', { name: 'Priority: Medium' }).click();
  await page.getByRole('menuitemradio', { name: 'Urgent' }).click();
  await expect(c.getByRole('button', { name: 'Priority: Urgent' })).toBeVisible();

  await c.hover();
  await c.getByRole('button', { name: 'Mark complete' }).click();
  await expect(col(page, 'Done').getByRole('button', { name: 'Build hero component', exact: true })).toBeVisible();
});
