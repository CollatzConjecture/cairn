import { expect, test } from '../fixtures';

test('sidebar links navigate, mark the current page, and browser back returns', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/home$/);
  const sidebar = page.getByRole('navigation', { name: 'Main' });

  await sidebar.getByRole('link', { name: 'Inbox' }).click();
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(sidebar.getByRole('link', { name: 'Inbox' })).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveTitle('Inbox · Cairn');

  await page.goBack();
  await expect(page).toHaveURL(/\/home$/);
  await expect(sidebar.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  await expect(sidebar.getByRole('link', { name: 'Inbox' })).not.toHaveAttribute('aria-current', 'page');
});

test('a sidebar project opens its default tab and expands to its sub-pages', async ({ page }) => {
  await page.goto('/home');
  const sidebar = page.getByRole('navigation', { name: 'Main' });
  await sidebar.getByRole('link', { name: 'Mobile App' }).click();
  await expect(page).toHaveURL(/\/projects\/p2\/board$/);
  await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toContainText('Mobile App');

  const item = sidebar.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Mobile App' }) });
  await item.hover();
  await item.getByRole('button', { name: 'Expand sub-pages' }).click();
  await item.getByRole('link', { name: 'Timeline' }).click();
  await expect(page).toHaveURL(/\/projects\/p2\/timeline$/);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the sidebar opens as a sheet and closes after navigating', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await sheet.getByRole('link', { name: 'Members' }).click();
    await expect(page).toHaveURL(/\/members$/);
    await expect(sheet).toBeHidden();
  });
});
