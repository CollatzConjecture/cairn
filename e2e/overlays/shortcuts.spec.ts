import { expect, test } from '../fixtures';
import { act, openDrawer, visit } from './helpers';

test('n, p and ? open the new task, new project and shortcuts dialogs', async ({ page }) => {
  await visit(page);
  await page.keyboard.press('n');
  await expect(page.getByRole('dialog', { name: 'New task' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Task name' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.keyboard.press('p');
  await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.keyboard.press('Shift+?');
  const keys = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(keys).toBeVisible();
  await expect(keys.getByText('Go to My Tasks')).toBeVisible();
});

test('Ctrl+K toggles the command menu and / opens it in search mode', async ({ page }) => {
  await visit(page);
  await page.keyboard.press('Control+k');
  const menu = page.getByRole('dialog', { name: 'Command menu' });
  await expect(menu.getByPlaceholder('Type a command or search…')).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(menu).toBeHidden();
  await expect(page.locator('body')).toBeFocused();

  await page.keyboard.press('/');
  await expect(menu.getByPlaceholder('Search tasks, projects, people, files, comments…')).toBeFocused();
  await expect(menu.getByText('Search', { exact: true })).toBeVisible();
});

test('g then a letter goes to that page', async ({ page }) => {
  await visit(page);
  for (const [k, path] of [
    ['i', '/inbox'],
    ['t', '/my-tasks'],
    ['p', '/projects'],
    ['c', '/calendar'],
    ['n', '/notifications'],
    ['a', '/activity'],
    ['m', '/members'],
    ['s', '/settings/appearance'],
    ['h', '/home'],
  ] as const) {
    await page.keyboard.press('g');
    await page.keyboard.press(k);
    await expect(page).toHaveURL(path);
  }
});

test('a g chord expires after 1.2 seconds, so the next key is its own shortcut', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-07T14:30:00-07:00') });
  await visit(page);
  await page.keyboard.press('g');
  await page.clock.fastForward(1500);
  await page.keyboard.press('p');
  await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
  await expect(page).toHaveURL('/home');
});

test('[ toggles the sidebar and Ctrl+Shift+L toggles dark mode', async ({ page }) => {
  await visit(page);
  const sidebar = page.locator('[data-slot=sidebar][data-state]');
  await expect(sidebar).toHaveAttribute('data-state', 'expanded');
  await page.keyboard.press('[');
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  await page.keyboard.press('[');
  await expect(sidebar).toHaveAttribute('data-state', 'expanded');

  const html = page.locator('html');
  await expect(html).not.toHaveClass(/\bdark\b/);
  await page.keyboard.press('Control+Shift+L');
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(page.getByText('Dark mode on')).toBeVisible();
  await page.reload();
  await expect(html).toHaveClass(/\bdark\b/);
});

test('e edits the task open in the drawer', async ({ page }) => {
  await visit(page);
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await openDrawer(page);
  await page.keyboard.press('e');
  const edit = page.getByRole('dialog', { name: 'Edit task' });
  await expect(edit).toBeVisible();
  await expect(edit.getByRole('textbox', { name: 'Task name' })).toHaveValue('Triage beta tester feedback');
});

test('single-key shortcuts are ignored while typing, inside a dialog, and outside the app', async ({ page }) => {
  await visit(page);
  await page.keyboard.press('n');
  const title = page.getByRole('textbox', { name: 'Task name' });
  await title.pressSequentially('np?');
  await expect(title).toHaveValue('np?');
  await expect(page.getByRole('dialog')).toHaveCount(1);

  await page.keyboard.press('Escape');
  await act(page, s => s.go({ r: 'login' }));
  await expect(page).toHaveURL('/login');
  await page.keyboard.press('Control+k');
  await page.keyboard.press('n');
  await page.keyboard.press('g');
  await page.keyboard.press('h');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL('/login');
});

test('Escape closes the topmost surface first: palette, then dialog, then drawer', async ({ page }) => {
  const drawer = await openDrawer(page);
  await page.keyboard.press('e');
  await expect(page.getByRole('textbox', { name: 'Task name' })).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(page.getByPlaceholder('Type a command or search…')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeHidden();
  await expect(page.getByRole('textbox', { name: 'Task name' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Edit task' })).toBeHidden();
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

test('with no surface open, Escape cancels the inline composer, then clears the selection', async ({ page }) => {
  await visit(page, '/projects/p1/list');
  await page.getByRole('checkbox', { name: 'Select Write homepage copy' }).click();
  await expect(page.getByRole('toolbar', { name: 'Bulk actions' })).toBeVisible();
  await page.getByRole('button', { name: 'Add task to Backlog' }).click();
  const composer = page.getByRole('textbox', { name: 'New task name' });
  await expect(composer).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(composer).toHaveCount(0);
  await expect(page.getByRole('toolbar', { name: 'Bulk actions' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('toolbar', { name: 'Bulk actions' })).toHaveCount(0);
});
