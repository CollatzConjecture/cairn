import { expect, test } from '../fixtures';
import { main, saved, toast, visit } from './helpers';

test('the unread filter narrows the list and "Show all" brings it back', async ({ page }) => {
  await visit(page, '/notifications');
  await expect(main(page).getByText('6 unread')).toBeVisible();
  await expect(main(page).getByRole('button', { name: /John Carter completed/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Unread' }).click();
  await expect(main(page).getByRole('button', { name: /John Carter completed/ })).toHaveCount(0);
  await expect(main(page).getByRole('button', { name: /Emma Wilson commented on/ })).toBeVisible();

  await page.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(toast(page, "You're all caught up.")).toBeVisible();
  await expect(main(page).getByRole('heading', { name: "You're all caught up." })).toBeVisible();
  await page.getByRole('button', { name: 'Show all' }).click();
  await expect(page.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
  await expect(main(page).getByRole('button', { name: /John Carter completed/ })).toBeVisible();
});

test('marking one notification read updates the count and persists', async ({ page }) => {
  await visit(page, '/notifications');
  const row = main(page).getByRole('listitem').filter({ hasText: 'Emma Wilson commented on' });
  await row.getByRole('button', { name: 'Mark as read' }).click();
  await expect(main(page).getByText('5 unread')).toBeVisible();
  await page.reload();
  await expect(main(page).getByText('5 unread')).toBeVisible();
  expect((await saved(page)).data.notifs.find((n: { id: string }) => n.id === 'n3').read).toBe(true);
});

test('opening a notification marks it read and opens its task', async ({ page }) => {
  await visit(page, '/notifications');
  await main(page)
    .getByRole('button', { name: /Emma Wilson commented on/ })
    .click();
  await expect(page.getByRole('dialog', { name: /Design mobile onboarding/ })).toBeVisible();
  await expect(main(page).getByText('5 unread')).toBeVisible();
});
