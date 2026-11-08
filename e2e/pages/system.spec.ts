import { expect, test } from '../fixtures';
import { main, toast, visit } from './helpers';

test('the design system switches theme and opens the live dialogs', async ({ page }) => {
  await visit(page, '/design-system');
  await page.getByRole('tablist', { name: 'Theme' }).getByRole('tab', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await expect(main(page).getByRole('region', { name: 'Data display' }).getByText('Create homepage wireframes').first()).toBeVisible();

  await page.getByRole('button', { name: 'Confirmation' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Archive project' }).click();
  await expect(toast(page, 'This was a preview — nothing was archived')).toBeVisible();

  await page.getByRole('button', { name: 'Drawer' }).click();
  await expect(page.getByRole('dialog', { name: /Create homepage wireframes/ })).toBeVisible();
});

test('system states toggle offline and open the real confirmations', async ({ page }) => {
  await visit(page, '/states');
  await page.getByRole('button', { name: 'Simulate offline' }).click();
  await expect(page.getByRole('button', { name: 'Go back online' })).toBeVisible();
  await page.getByRole('button', { name: 'Go back online' }).click();

  await page.getByRole('button', { name: 'Delete task' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Delete task?' })).toBeVisible();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});
