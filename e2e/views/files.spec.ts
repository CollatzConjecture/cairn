import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

const files = (page: Page) => page.getByLabel('Files', { exact: true });
const card = (page: Page, name: string) =>
  files(page)
    .locator('div')
    .filter({ has: page.getByRole('button', { name, exact: true }) })
    .first();

test('grid and list layouts, search, type filter and sort narrow and order the files', async ({ page }) => {
  await page.goto('/projects/p1/files');
  await expect(page.getByRole('button', { name: 'hero-exploration.png' })).toBeVisible();
  await page.getByRole('button', { name: 'List view' }).click();
  await expect(page.getByRole('table', { name: 'Files' }).getByRole('columnheader', { name: 'Uploaded by' })).toBeVisible();
  await page.getByRole('button', { name: 'Grid view' }).click();
  await expect(page.getByRole('table', { name: 'Files' })).toHaveCount(0);

  await page.getByRole('textbox', { name: 'Search files' }).fill('hero');
  await expect(files(page).getByRole('button', { name: /\./ })).toHaveCount(1);
  await page.getByRole('textbox', { name: 'Search files' }).fill('zzz');
  await expect(page.getByText('No files match your search.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search files' }).fill('');

  await page.getByRole('combobox', { name: 'Filter by type' }).click();
  await page.getByRole('option', { name: 'PDF' }).click();
  await expect(files(page).getByRole('button', { name: /\.pdf$/ })).toHaveCount(2);
  await expect(files(page).getByRole('button', { name: /\.png$/ })).toHaveCount(0);

  await page.getByRole('combobox', { name: 'Sort' }).click();
  await page.getByRole('option', { name: 'Sort: Name' }).click();
  await expect(files(page).getByRole('button', { name: /\.pdf$/ })).toHaveText(['nav-audit-findings.pdf', 'sitemap-v2.pdf']);
});

test('uploading shows progress, then adds the file', async ({ page }) => {
  await page.goto('/projects/p1/files');
  await page
    .getByLabel('Upload files')
    .first()
    .setInputFiles({ name: 'launch-notes.md', mimeType: 'text/markdown', buffer: Buffer.from('# Launch') });
  await expect(page.getByRole('progressbar', { name: 'Uploading launch-notes.md' })).toBeVisible();
  await expect(page.getByText('Uploaded launch-notes.md')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'launch-notes.md', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'launch-notes.md', exact: true })).toBeVisible();
});

test('the file menu duplicates, renames, and deletes with undo', async ({ page }) => {
  await page.goto('/projects/p1/files');
  await card(page, 'sitemap-v2.pdf').hover();
  await card(page, 'sitemap-v2.pdf').getByRole('button', { name: 'File options' }).click();
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect(page.getByText('File duplicated')).toBeVisible();
  await expect(page.getByRole('button', { name: 'sitemap-v2 copy.pdf', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'sitemap-v2 copy.pdf', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Rename' }).click();
  await page.getByRole('textbox', { name: 'File name' }).fill('sitemap-v3.pdf');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'sitemap-v3.pdf', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'sitemap-v3.pdf', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete file' }).click();
  await expect(page.getByText('Deleted sitemap-v3.pdf')).toBeVisible();
  await expect(page.getByRole('button', { name: 'sitemap-v3.pdf', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'sitemap-v3.pdf', exact: true })).toBeVisible();
});

test('clicking a file opens its preview', async ({ page }) => {
  await page.goto('/projects/p1/files');
  await page.getByRole('button', { name: 'interview-notes.docx', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('interview-notes.docx');
});

test('a file’s copied link opens its preview', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/projects/p1/files');
  await card(page, 'nav-audit-findings.pdf').getByRole('button', { name: 'File options' }).click();
  await page.getByRole('menuitem', { name: 'Copy link' }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toBe(new URL('/projects/p1/files?file=f2', page.url()).href);
  await page.goto(link);
  await expect(page.getByRole('dialog', { name: 'nav-audit-findings.pdf' })).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/p1\/files$/);
});
