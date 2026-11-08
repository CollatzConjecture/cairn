import { expect, test } from '../fixtures';

const row = (page: import('@playwright/test').Page, title: string) => page.getByRole('row').filter({ hasText: title });

test('archiving from the task menu shows an undo toast that restores the task', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await row(page, 'Write homepage copy').getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await expect(row(page, 'Write homepage copy')).toHaveCount(0);

  await expect(page.getByText('Archived “Write homepage copy”')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(row(page, 'Write homepage copy')).toHaveCount(1);
});

test('right-click opens the task menu; its status submenu and Mark complete with undo work', async ({ page }) => {
  await page.goto('/projects/p1/list');
  await row(page, 'Migrate blog to new CMS').click({ button: 'right', position: { x: 600, y: 10 } });
  await page.getByRole('menuitem', { name: 'Status' }).hover();
  await page.getByRole('menuitemradio', { name: 'Review' }).click();
  await expect(row(page, 'Migrate blog to new CMS').getByRole('button', { name: 'Status: Review' })).toBeVisible();

  await row(page, 'Migrate blog to new CMS').click({ button: 'right', position: { x: 600, y: 10 } });
  await page.getByRole('menuitem', { name: 'Mark complete' }).click();
  await expect(row(page, 'Migrate blog to new CMS').getByRole('button', { name: 'Status: Done' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(row(page, 'Migrate blog to new CMS').getByRole('button', { name: 'Status: Review' })).toBeVisible();
});
