import { expect, test } from '../fixtures';
import { main, visit } from './helpers';

test('projects switch between grid, list and table', async ({ page }) => {
  await visit(page, '/projects');
  const layout = page.getByRole('tablist', { name: 'Layout' });
  await expect(layout.getByRole('tab', { name: 'Grid' })).toHaveAttribute('aria-selected', 'true');
  await expect(main(page).getByRole('link', { name: 'Website Redesign' })).toBeVisible();
  await expect(main(page).getByRole('table')).toHaveCount(0);

  await layout.getByRole('tab', { name: 'Table' }).click();
  const table = main(page).getByRole('table');
  await expect(table.getByRole('columnheader', { name: 'Last activity' })).toBeVisible();
  await expect(table.getByRole('row').filter({ hasText: 'Mobile App' })).toBeVisible();

  await layout.getByRole('tab', { name: 'List' }).click();
  await expect(main(page).getByRole('table')).toHaveCount(0);
  await expect(main(page).getByRole('link', { name: 'Mobile App' })).toBeVisible();

  await main(page).getByRole('link', { name: 'Mobile App' }).click();
  await expect(page).toHaveURL(/\/projects\/p2\//);
});

test('search and status filters narrow the projects, and clearing restores them', async ({ page }) => {
  await visit(page, '/projects');
  await page.getByRole('searchbox', { name: 'Search projects' }).fill('portal');
  await expect(main(page).getByRole('link', { name: 'Customer Portal' })).toBeVisible();
  await expect(main(page).getByRole('link', { name: 'Website Redesign' })).toHaveCount(0);

  await page.getByRole('searchbox', { name: 'Search projects' }).fill('nothing-matches');
  await expect(main(page).getByRole('heading', { name: 'No results found' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(main(page).getByRole('link', { name: 'Website Redesign' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Filter by status' }).click();
  await page.getByRole('option', { name: 'At Risk' }).click();
  await expect(main(page).getByRole('link', { name: 'Product Launch' })).toBeVisible();
  await expect(main(page).getByRole('link', { name: 'Website Redesign' })).toHaveCount(0);
});

test('a project card opens its menu from the options button', async ({ page }) => {
  await visit(page, '/projects');
  await main(page).getByRole('button', { name: 'Project options' }).first().click();
  await expect(page.getByRole('menuitem', { name: 'Open' })).toBeVisible();
});
