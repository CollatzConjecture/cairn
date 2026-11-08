import { expect, test } from '../fixtures';

test('the theme picked in the account menu applies and survives a reload', async ({ page }) => {
  await page.goto('/home');
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/\bdark\b/);

  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menu').getByRole('button', { name: 'Dark' }).click();
  await expect(html).toHaveClass(/\bdark\b/);

  await page.reload();
  await expect(html).toHaveClass(/\bdark\b/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gr8r.v2') ?? '{}').prefs.theme)).toBe('dark');
});

test('the system theme follows the OS while the app is open', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/home');
  const html = page.locator('html');
  await expect(html).toHaveClass(/\bdark\b/);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html).not.toHaveClass(/\bdark\b/);
});
