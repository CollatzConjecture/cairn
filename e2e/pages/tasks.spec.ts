import { expect, test } from '../fixtures';
import { main, saved, visit } from './helpers';

test('the tasks page switches between list, board and table, and remembers the layout', async ({ page }) => {
  await visit(page, '/tasks');
  const layout = page.getByRole('tablist', { name: 'Layout' });
  await expect(layout.getByRole('tab', { name: 'List' })).toHaveAttribute('aria-selected', 'true');
  await expect(main(page).getByRole('table', { name: 'Tasks' })).toBeVisible();

  await layout.getByRole('tab', { name: 'Board' }).click();
  await expect(layout.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'true');
  await expect(main(page).getByRole('table', { name: 'Tasks' })).toHaveCount(0);

  await layout.getByRole('tab', { name: 'Table' }).click();
  await page.reload();
  await expect(page.getByRole('tablist', { name: 'Layout' }).getByRole('tab', { name: 'Table' })).toHaveAttribute('aria-selected', 'true');
  expect((await saved(page)).views.tasks.mode).toBe('table');
});

test('my tasks groups by due date and switches to the calendar', async ({ page }) => {
  await visit(page, '/my-tasks');
  await expect(main(page).getByText('1 due today · 1 overdue · 5 upcoming')).toBeVisible();
  await expect(main(page).getByRole('button', { name: 'Add task to Today' })).toBeVisible();
  await page.getByRole('tablist', { name: 'View' }).getByRole('tab', { name: 'Calendar' }).click();
  await expect(main(page).getByRole('button', { name: 'Add task to Today' })).toHaveCount(0);
  await expect(main(page).getByText('October 2026').first()).toBeVisible();
});

test('overview, favorites and activity show their data', async ({ page }) => {
  await visit(page, '/overview');
  await expect(main(page).getByRole('heading', { name: 'Workspace overview' })).toBeVisible();
  await main(page).getByRole('row').filter({ hasText: 'Mobile App' }).getByRole('button', { name: 'Mobile App' }).click();
  await expect(page).toHaveURL(/\/projects\/p2\/overview$/);

  await visit(page, '/favorites');
  await expect(main(page).getByRole('link', { name: 'Website Redesign' })).toBeVisible();
  await expect(main(page).getByRole('button', { name: 'Create homepage wireframes' })).toBeVisible();

  await visit(page, '/activity');
  await page.getByRole('tab', { name: 'Comments' }).click();
  await expect(main(page).getByText('commented on').first()).toBeVisible();
  await expect(main(page).getByText(' moved ')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Filter by person' }).click();
  await page.getByRole('option', { name: 'Priya Patel' }).click();
  await expect(main(page).getByRole('heading', { name: 'No activity yet' })).toBeVisible();
});
