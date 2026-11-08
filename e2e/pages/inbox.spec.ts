import { expect, test } from '../fixtures';
import { main, saved, toast, visit } from './helpers';

const item = (page: import('@playwright/test').Page, text: RegExp) => main(page).getByRole('button', { name: text });

test('inbox categories filter the list and show unread counts', async ({ page }) => {
  await visit(page, '/inbox');
  const tabs = page.getByRole('tablist', { name: 'Inbox categories' });
  await expect(tabs.getByRole('tab', { name: 'All 6' })).toHaveAttribute('aria-selected', 'true');
  await expect(item(page, /Sarah Chen moved to Review/)).toBeVisible();

  await tabs.getByRole('tab', { name: 'Mentions 2' }).click();
  await expect(item(page, /mentioned you in/)).toHaveCount(2);
  await expect(item(page, /moved to Review/)).toHaveCount(0);

  await tabs.getByRole('tab', { name: 'Updates 2' }).click();
  await expect(item(page, /Product Launch is at risk/)).toBeVisible();
  await expect(item(page, /mentioned you in/)).toHaveCount(0);
});

test('the unread switch hides read notifications', async ({ page }) => {
  await visit(page, '/inbox');
  await expect(item(page, /John Carter completed/)).toBeVisible();
  await page.getByRole('switch', { name: 'Unread' }).click();
  await expect(item(page, /John Carter completed/)).toHaveCount(0);
  await expect(item(page, /Emma Wilson commented on/)).toBeVisible();
});

test('selecting a notification previews it, marks it read, and a reply posts a comment', async ({ page }) => {
  await visit(page, '/inbox');
  await expect(main(page).getByText('Select a notification')).toBeVisible();
  await item(page, /Emma Wilson commented on/).click();
  await expect(main(page).getByRole('heading', { name: 'Design mobile onboarding' })).toBeVisible();
  await expect(main(page).getByRole('button', { name: 'Open task' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'All 5' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Comments' })).toBeVisible();

  await main(page).getByRole('textbox', { name: 'Reply' }).fill('On it, thanks Emma');
  await main(page).getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(toast(page, 'Reply posted')).toBeVisible();
  await expect(main(page).getByText('On it, thanks Emma')).toBeVisible();

  await page.reload();
  const d = (await saved(page)).data;
  expect(d.notifs.find((n: { id: string }) => n.id === 'n3').read).toBe(true);
  expect(d.comments.some((c: { text: string }) => c.text === 'On it, thanks Emma')).toBe(true);
});

test('read state toggles per item and mark all read clears every count', async ({ page }) => {
  await visit(page, '/inbox');
  const row = main(page).getByRole('listitem').filter({ hasText: 'John Carter completed' });
  await row.getByRole('button', { name: 'Mark as unread' }).click();
  await expect(page.getByRole('tab', { name: 'All 7' })).toBeVisible();

  await page.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(toast(page, "You're all caught up.")).toBeVisible();
  await expect(page.getByRole('tab', { name: 'All', exact: true })).toBeVisible();
  await page.reload();
  expect((await saved(page)).data.notifs.every((n: { read: boolean }) => n.read)).toBe(true);
});
