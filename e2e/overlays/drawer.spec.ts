import { expect, test } from '../fixtures';
import { openDrawer, openFromList, saved, visit } from './helpers';

test('the drawer shows the task, closes with its button, and returns focus to the task that opened it', async ({ page }) => {
  await visit(page);
  const opener = page.getByRole('button', { name: 'Triage beta tester feedback', exact: true }).first();
  await opener.click();
  const drawer = page.getByRole('dialog', { name: 'Task: Triage beta tester feedback' });
  await expect(drawer.getByRole('textbox', { name: 'Task title' })).toHaveValue('Triage beta tester feedback');
  await expect(drawer.getByText('MOB-124')).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Status: To Do' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Repeat: Weekly' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Estimate: 4h' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Labels' })).toHaveText('Research');

  // The side panel leaves the page usable: another task opens in the same panel.
  await page.getByRole('button', { name: 'Weekly design sync notes', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Task: Weekly design sync notes' })).toBeVisible();

  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Weekly design sync notes', exact: true }).first()).toBeFocused();
});

test('Escape closes the drawer', async ({ page }) => {
  const drawer = await openDrawer(page);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

test('the full page toggle centres the task over a scrim that closes it', async ({ page }) => {
  const drawer = await openDrawer(page);
  expect((await drawer.boundingBox())?.width).toBe(620);
  await drawer.getByRole('button', { name: 'Toggle full page' }).click();
  await expect(drawer.getByRole('button', { name: 'Toggle full page' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await drawer.boundingBox())?.width).toBe(980);
  const box = await drawer.boundingBox();
  expect(Math.round((box?.x ?? 0) + (box?.width ?? 0) / 2)).toBe(720);

  await drawer.getByRole('button', { name: 'Toggle full page' }).click();
  await expect.poll(async () => (await drawer.boundingBox())?.width).toBe(620);
  await drawer.getByRole('button', { name: 'Toggle full page' }).click();
  await page.mouse.click(40, 450);
  await expect(drawer).toBeHidden();
});

test('the comments and activity tabs switch the conversation', async ({ page }) => {
  const drawer = await openFromList(page, 'Create homepage wireframes');
  await expect(drawer.getByRole('tab', { name: 'Comments 3' })).toHaveAttribute('aria-selected', 'true');
  await expect(drawer.getByText('Hero spacing maps cleanly to our 8pt scale.')).toBeVisible();
  await drawer.getByRole('tab', { name: /^Activity/ }).click();
  await expect(drawer.getByText('Task created')).toBeVisible();
  await expect(drawer.getByText('Hero spacing maps cleanly to our 8pt scale.')).toBeHidden();
});

test('renaming the title saves on Enter and persists', async ({ page }) => {
  const drawer = await openFromList(page, 'Write homepage copy');
  const title = drawer.getByRole('textbox', { name: 'Task title' });
  await title.fill('Write homepage and pricing copy');
  await title.press('Enter');
  const renamed = page.getByRole('dialog', { name: 'Task: Write homepage and pricing copy' });
  await expect(renamed.getByRole('textbox', { name: 'Task title' })).not.toBeFocused();
  await expect(page.getByRole('row').filter({ hasText: 'Write homepage and pricing copy' })).toHaveCount(1);
  await renamed.getByRole('tab', { name: /^Activity/ }).click();
  await expect(renamed.getByText('You renamed to “Write homepage and pricing copy”')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: 'Write homepage and pricing copy' })).toHaveCount(1);
});

test('the description saves as you type, with formatting, and persists', async ({ page }) => {
  const drawer = await openFromList(page, 'Write homepage copy');
  const desc = drawer.getByRole('textbox', { name: 'Description' });
  await desc.click();
  await page.keyboard.type('Draft hero and ');
  await drawer.getByRole('button', { name: 'Bold' }).click();
  await page.keyboard.type('pricing');
  await expect(desc.locator('b')).toHaveText('pricing');

  await page.reload();
  const again = await openFromList(page, 'Write homepage copy');
  await expect(again.getByRole('textbox', { name: 'Description' })).toHaveText('Draft hero and pricing');
});

test('every property picker in the drawer changes the task and the change persists', async ({ page }) => {
  const drawer = await openFromList(page, 'Write homepage copy');
  await drawer.getByRole('button', { name: 'Status: Backlog' }).click();
  await page.getByRole('menuitemradio', { name: 'Review' }).click();
  await drawer.getByRole('button', { name: /^Priority:/ }).click();
  await page.getByRole('menuitemradio', { name: 'Urgent' }).click();
  await drawer.getByRole('button', { name: /^Assignee:/ }).click();
  await page.getByRole('option', { name: 'Lena Fischer' }).click();
  await drawer.getByRole('button', { name: 'Due date' }).click();
  await page.getByRole('button', { name: 'Tomorrow', exact: true }).last().click();
  await drawer.getByRole('button', { name: 'Start date' }).click();
  await page.getByRole('button', { name: 'Today', exact: true }).last().click();
  await drawer.getByRole('button', { name: 'Labels' }).click();
  await page.getByRole('option', { name: 'Bug' }).click();
  await page.keyboard.press('Escape');
  await drawer.getByRole('button', { name: /^Repeat:/ }).click();
  await page.getByRole('menuitemradio', { name: 'Monthly' }).click();
  await drawer.getByRole('button', { name: /^Estimate:/ }).click();
  await page.getByRole('menuitemradio', { name: '1h' }).click();
  await drawer.getByRole('button', { name: 'Blocked by' }).click();
  await page.getByRole('option', { name: /Create homepage wireframes/ }).click();
  await page.keyboard.press('Escape');

  const check = async () => {
    const d = page.getByRole('dialog', { name: /^Task: Write homepage copy/ });
    await expect(d.getByRole('button', { name: 'Status: Review' })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Priority: Urgent' })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Assignee: Lena Fischer' })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Due date' })).toHaveText('Tomorrow');
    await expect(d.getByRole('button', { name: 'Start date' })).toHaveText('Oct 7');
    await expect(d.getByRole('button', { name: 'Labels' })).toHaveText('ContentBug');
    await expect(d.getByRole('button', { name: 'Repeat: Monthly' })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Estimate: 1h' })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Blocked by' })).toContainText('Create homepage wireframes');
  };
  await check();
  await drawer.getByRole('tab', { name: /^Activity/ }).click();
  await expect(drawer.getByText('You changed priority to Urgent')).toBeVisible();

  await page.reload();
  await openFromList(page, 'Write homepage copy');
  await check();
});

test('moving the task to another project gives it that project and a new key', async ({ page }) => {
  const drawer = await openFromList(page, 'Write homepage copy');
  await drawer.getByRole('button', { name: 'Project: Website Redesign' }).click();
  await page.getByRole('option', { name: 'Mobile App' }).click();
  await expect(drawer.getByRole('button', { name: 'Project: Mobile App' })).toBeVisible();
  await expect(drawer.getByText(/^MOB-\d+$/)).toBeVisible();
  const t = (await saved(page)).data.tasks.find((x: { title: string }) => x.title === 'Write homepage copy');
  expect(t.project).toBe('p2');
});

test('mark complete shows the completed banner, and Reopen undoes it', async ({ page }) => {
  const drawer = await openDrawer(page);
  await drawer.getByRole('button', { name: 'Mark complete' }).click();
  const banner = drawer.getByRole('status').filter({ hasText: 'Completed' });
  await expect(banner).toContainText('Completed just now.');
  await expect(drawer.getByRole('button', { name: 'Status: Done' })).toBeVisible();
  // A weekly task schedules its next occurrence.
  await expect(page.getByText('Next “Triage beta tester feedback” scheduled for Oct 14')).toBeVisible();
  await drawer.getByRole('button', { name: 'Reopen task' }).click();
  await expect(drawer.getByRole('button', { name: 'Status: To Do' })).toBeVisible();
  await expect(banner).toHaveCount(0);
});

test('favorite and copy link from the header', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const drawer = await openDrawer(page);
  await drawer.getByRole('button', { name: 'Favorite' }).click();
  await expect(drawer.getByRole('button', { name: 'Favorite' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Added to favorites')).toBeVisible();
  await drawer.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByText('Link copied')).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toBe(new URL('/projects/p2?task=MOB-124', page.url()).href);

  await page.goto(link);
  await expect(page).toHaveURL(/\/projects\/p2\/board$/);
  await expect(page.getByRole('dialog', { name: 'Task: Triage beta tester feedback' })).toBeVisible();
});

test('an overdue task offers to reschedule', async ({ page }) => {
  const drawer = await openFromList(page, 'Create homepage wireframes');
  const banner = drawer.getByRole('status').filter({ hasText: 'Overdue' });
  await expect(banner).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Due date' }).click();
  await page.getByRole('button', { name: 'Previous month' }).click();
  await page.getByRole('button', { name: 'Sep 1, 2026' }).click();
  await expect(banner).toContainText('Overdue by 36 days.');
  await banner.getByRole('button', { name: 'Reschedule' }).click();
  await page.getByRole('button', { name: 'Next week', exact: true }).last().click();
  await expect(banner).toHaveCount(0);
});

test('uploading attachments shows progress, then a card that previews and can be removed', async ({ page }) => {
  const drawer = await openDrawer(page);
  await drawer
    .getByText('Drop files or click to attach')
    .locator('..')
    .locator('input[type=file]')
    .setInputFiles({
      name: 'feedback-notes.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 notes'),
    });
  await expect(drawer.getByRole('button', { name: 'feedback-notes.pdf', exact: true })).toBeVisible();
  await expect(page.getByText('Uploaded feedback-notes.pdf')).toBeVisible();
  await expect(drawer.getByText('PDF · 14 B')).toBeVisible();

  await drawer.getByRole('button', { name: 'feedback-notes.pdf', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'feedback-notes.pdf' });
  await expect(preview.getByText('Attached to')).toBeVisible();
  await preview.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(preview).toBeHidden();

  await page.reload();
  const again = await openDrawer(page);
  await again.getByRole('button', { name: 'Remove attachment feedback-notes.pdf' }).click();
  await expect(page.getByText('Removed feedback-notes.pdf')).toBeVisible();
  await expect(again.getByText('Drop files or click to attach')).toBeVisible();
  await page.reload();
  await expect
    .poll(async () => (await saved(page)).data.tasks.find((x: { title: string }) => x.title === 'Triage beta tester feedback').attachments)
    .toEqual([]);
});
