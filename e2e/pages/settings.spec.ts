import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { main, saved, toast, visit } from './helpers';

const prefs = async (page: Page) => (await saved(page)).prefs;
async function pick(page: Page, select: string, option: string) {
  await page.getByRole('combobox', { name: select }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test('appearance: theme, accent, sidebar and task density apply at once and survive a reload', async ({ page }) => {
  await visit(page, '/settings/appearance');
  const html = page.locator('html');

  await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: /Dark/ }).click();
  await expect(html).toHaveClass(/\bdark\b/);
  await page.getByRole('radiogroup', { name: 'Accent color' }).getByRole('radio', { name: 'Teal' }).click();
  await expect(html).toHaveAttribute('data-accent', 'teal');
  await page.getByRole('tablist', { name: 'Sidebar density' }).getByRole('tab', { name: 'Compact' }).click();
  await expect(html).toHaveAttribute('data-side', 'compact');
  await page.getByRole('tablist', { name: 'Task display' }).getByRole('tab', { name: 'Compact' }).click();
  await expect(html).toHaveAttribute('data-density', 'compact');
  await pick(page, 'Motion', 'Reduce motion');
  await expect(html).toHaveAttribute('data-motion', 'reduce');
  await expect(toast(page, 'Preference saved')).toBeVisible();

  await page.reload();
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(html).toHaveAttribute('data-accent', 'teal');
  await expect(html).toHaveAttribute('data-side', 'compact');
  await expect(html).toHaveAttribute('data-density', 'compact');
  await expect(html).toHaveAttribute('data-motion', 'reduce');
  await expect(page.getByRole('radio', { name: 'Teal' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('tablist', { name: 'Task display' }).getByRole('tab', { name: 'Compact' })).toHaveAttribute('aria-selected', 'true');
});

test('language and spellcheck persist', async ({ page }) => {
  await visit(page, '/settings/language');
  await pick(page, 'Language', 'Deutsch');
  await page.getByRole('switch', { name: 'Spellcheck' }).click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveText(/Deutsch/);
  await expect(page.getByRole('switch', { name: 'Spellcheck' })).not.toBeChecked();
  expect(await prefs(page)).toMatchObject({ lang: 'Deutsch', spell: false });
});

test('date & time: time zone, date format, week start and time format apply and persist', async ({ page }) => {
  await visit(page, '/settings/datetime');
  await expect(main(page).getByText('Preview: Oct 15')).toBeVisible();
  await pick(page, 'Date format', '1/10');
  await expect(main(page).getByText('Preview: 15/10')).toBeVisible();
  await pick(page, 'Time zone', '(GMT+01:00) Berlin');
  await pick(page, 'Start week on', 'Sunday');
  await pick(page, 'Time format', '24-hour (14:30)');

  await page.reload();
  await expect(main(page).getByText('Preview: 15/10')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Start week on' })).toHaveText(/Sunday/);
  expect(await prefs(page)).toMatchObject({ dateFmt: 'd/M', tz: '(GMT+01:00) Berlin', weekStart: 0, timeFmt: '24' });
});

test('preferences: the start page and how tasks open take effect', async ({ page }) => {
  await visit(page, '/settings/preferences');
  await pick(page, 'Open on launch', 'My Tasks');
  await pick(page, 'Open tasks in', 'Full page');
  await page.getByRole('switch', { name: 'Confirm before deleting tasks' }).click();

  await page.goto('/');
  await expect(page).toHaveURL(/\/my-tasks$/);
  expect(await prefs(page)).toMatchObject({ home: 'mytasks', openTasks: 'full', confirmDel: false });
});

test('profile: the name is required, and a saved name shows in the shell after a reload', async ({ page }) => {
  await visit(page, '/settings/profile');
  const name = page.getByLabel('Full name');
  await name.fill('');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(main(page).getByText('Enter your name')).toBeVisible();

  await name.fill('Jerry Lucas Jr.');
  await page.getByLabel('Title').fill('VP Product');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(toast(page, 'Profile updated')).toBeVisible();
  await page.getByRole('radiogroup', { name: 'Avatar color' }).getByRole('radio', { name: 'teal' }).click();

  await page.reload();
  await expect(page.getByLabel('Full name')).toHaveValue('Jerry Lucas Jr.');
  const s = await saved(page);
  expect(s.prefs).toMatchObject({ name: 'Jerry Lucas Jr.', title: 'VP Product' });
  expect(s.data.members.find((m: { id: string }) => m.id === s.data.me)).toMatchObject({ name: 'Jerry Lucas Jr.', c: '#23918A' });
});

test('workspace: renaming saves and the sidebar shows the new name', async ({ page }) => {
  await visit(page, '/settings/workspace');
  await page.getByLabel('Workspace name').fill('Cairn Labs');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(toast(page, 'Workspace settings saved')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Workspace name')).toHaveValue('Cairn Labs');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByText('Cairn Labs')).toBeVisible();
  expect((await saved(page)).data.ws.name).toBe('Cairn Labs');
});

test('members: invite opens the invite dialog and a role changes from the list', async ({ page }) => {
  await visit(page, '/settings/members');
  await main(page).getByRole('button', { name: 'Invite member' }).click();
  await expect(page.getByRole('dialog', { name: /Invite/ })).toBeVisible();
  await page.keyboard.press('Escape');

  await main(page).getByRole('button', { name: 'Role: Member' }).first().click();
  await page.getByRole('menuitemradio', { name: /^Guest/ }).click();
  await expect(toast(page, 'is now a Guest')).toBeVisible();
});

test('notification toggles save and persist', async ({ page }) => {
  await visit(page, '/settings/notif-email');
  const mentions = page.getByRole('switch', { name: 'Mentions' });
  await expect(mentions).toBeChecked();
  await mentions.click();
  await expect(toast(page, 'Notification preferences saved')).toBeVisible();

  await page.getByRole('link', { name: 'Task assignments' }).click();
  await page.getByRole('switch', { name: 'When my task is overdue' }).click();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'When my task is overdue' })).not.toBeChecked();
  await page.getByRole('link', { name: 'Email' }).click();
  await expect(page.getByRole('switch', { name: 'Mentions' })).not.toBeChecked();
});

test('password: the strength meter walks through every level, and the form validates', async ({ page }) => {
  await visit(page, '/settings/password');
  const nw = page.getByLabel('New password', { exact: true });
  for (const [pw, level] of [
    ['abc', 'Too short'],
    ['abcdefgh', 'Weak'],
    ['abcdefgh1', 'Fair'],
    ['abcdefgh1!', 'Good'],
    ['abcdefghijk1!', 'Strong'],
  ] as const) {
    await nw.fill(pw);
    await expect(main(page).getByText(`Password strength: ${level}`)).toBeVisible();
  }

  await nw.fill('short');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(main(page).getByText('Enter your current password')).toBeVisible();
  await expect(main(page).getByText('Use at least 10 characters, including a number or symbol')).toBeVisible();
  await expect(main(page).getByText("Passwords don't match")).toBeVisible();

  await page.getByLabel('Current password').fill('old-password');
  await nw.fill('a-much-longer-pass1');
  await page.getByLabel('Confirm new password').fill('a-much-longer-pass1');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(main(page).getByText('Password updated. Other sessions stay signed in.')).toBeVisible();
});

test('two-factor authentication turns on with a 6-digit code', async ({ page }) => {
  await visit(page, '/settings/2fa');
  await page.getByRole('button', { name: 'Set up two-factor authentication' }).click();
  await page.getByRole('textbox', { name: '6-digit code' }).fill('12');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(main(page).getByText('Enter the 6-digit code from your app')).toBeVisible();
  await page.getByRole('textbox', { name: '6-digit code' }).fill('123456');
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(main(page).getByText('Two-factor authentication is on.')).toBeVisible();
  await page.reload();
  await expect(main(page).getByText('Two-factor authentication is on.')).toBeVisible();
});

test('an unknown settings section is a 404 and the nav marks the current one', async ({ page }) => {
  await visit(page, '/settings/sessions');
  await expect(page.getByRole('navigation', { name: 'Settings' }).getByRole('link', { name: 'Sessions' })).toHaveAttribute('aria-current', 'page');
  await page
    .getByRole('button', { name: /Sign out MacBook|Sign out iPhone|Sign out Windows/ })
    .first()
    .click();
  await expect(toast(page, 'Session signed out')).toBeVisible();
  await visit(page, '/settings/nope');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
