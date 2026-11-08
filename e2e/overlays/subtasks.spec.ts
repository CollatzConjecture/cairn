import { expect, test } from '../fixtures';
import { openFromList, saved } from './helpers';

const TASK = 'Create homepage wireframes';
const subtitles = async (page: import('@playwright/test').Page) =>
  (await saved(page)).data.tasks.find((t: { title: string }) => t.title === TASK).subtasks.map((s: { title: string }) => s.title);

test('adding a subtask appends it, keeps the input ready, and persists', async ({ page }) => {
  const drawer = await openFromList(page, TASK);
  await expect(drawer.getByText('3/4')).toBeVisible();
  const add = drawer.getByRole('textbox', { name: 'Add subtask' });
  await add.fill('Write alt text');
  await add.press('Enter');
  await expect(drawer.getByRole('button', { name: 'Write alt text', exact: true })).toBeVisible();
  await expect(drawer.getByText('3/5')).toBeVisible();
  await expect(add).toHaveValue('');
  await expect(add).toBeFocused();

  await page.reload();
  await expect.poll(() => subtitles(page)).toEqual(['Desktop layout', 'Tablet layout', 'Mobile layout', 'Annotate interactions', 'Write alt text']);
});

test('ticking a subtask completes it and logs it', async ({ page }) => {
  const drawer = await openFromList(page, TASK);
  await drawer.getByRole('checkbox', { name: 'Complete subtask Annotate interactions' }).click();
  await expect(drawer.getByText('4/4')).toBeVisible();
  await expect(drawer.getByRole('checkbox', { name: 'Reopen subtask Annotate interactions' })).toBeChecked();
  await drawer.getByRole('tab', { name: /^Activity/ }).click();
  await expect(drawer.getByText('You completed subtask on “Annotate interactions”')).toBeVisible();
});

test('a subtask opens into its own view: rename, notes, assignee, due date, previous and next', async ({ page }) => {
  const drawer = page.getByRole('dialog', { name: /^(Task|Subtask): / });
  await openFromList(page, TASK);
  await drawer.getByRole('button', { name: 'Tablet layout', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Subtask: Tablet layout' })).toBeVisible();
  await expect(drawer.getByText('Subtask 2 of 4 · Done')).toBeVisible();

  const title = drawer.getByRole('textbox', { name: 'Subtask title' });
  await expect(title).toBeFocused();
  await title.fill('Tablet and small laptop layout');
  await title.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Subtask: Tablet and small laptop layout' })).toBeVisible();
  await drawer.getByRole('textbox', { name: 'Notes' }).fill('Check 1024px breakpoint');
  await drawer.getByRole('button', { name: 'Subtask assignee: Unassigned' }).click();
  await page.getByRole('option', { name: 'Sarah Chen' }).click();
  await drawer.getByRole('button', { name: 'Subtask due date' }).click();
  await page.getByRole('button', { name: 'Tomorrow', exact: true }).last().click();
  await expect(drawer.getByRole('button', { name: 'Subtask due date' })).toHaveText('Tomorrow');

  await drawer.getByRole('button', { name: 'Next subtask' }).click();
  await expect(drawer.getByText('Subtask 3 of 4 · Done')).toBeVisible();
  await expect(drawer.getByRole('textbox', { name: 'Subtask title' })).toHaveValue('Mobile layout');
  await drawer.getByRole('button', { name: 'Next subtask' }).click();
  await expect(drawer.getByRole('button', { name: 'Next subtask' })).toBeDisabled();
  await drawer.getByRole('button', { name: 'Previous subtask' }).click();
  await drawer.getByRole('button', { name: 'Previous subtask' }).click();
  await expect(drawer.getByRole('textbox', { name: 'Notes' })).toHaveValue('Check 1024px breakpoint');

  // Escape leaves the subtask view first, then closes the drawer.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: `Task: ${TASK}` })).toBeVisible();
  const row = drawer.getByRole('button', { name: 'Tablet and small laptop layout', exact: true });
  await expect(row).toBeVisible();
  await expect(drawer.getByText('Tomorrow').first()).toBeVisible();

  await page.reload();
  const t = (await saved(page)).data.tasks.find((x: { title: string }) => x.title === TASK);
  expect(t.subtasks[1]).toMatchObject({ title: 'Tablet and small laptop layout', note: 'Check 1024px breakpoint', assignee: 'm2', due: '2026-10-08' });
});

test('the back button and the parent link return to the task', async ({ page }) => {
  const drawer = await openFromList(page, TASK);
  await drawer.getByRole('button', { name: 'Open subtask details' }).first().click({ force: true });
  await expect(page.getByRole('dialog', { name: 'Subtask: Desktop layout' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: TASK }).first().click();
  await expect(page.getByRole('dialog', { name: `Task: ${TASK}` })).toBeVisible();
});

test('converting a subtask makes it a task in the same project', async ({ page }) => {
  const drawer = page.getByRole('dialog', { name: /^(Task|Subtask): / });
  await openFromList(page, TASK);
  await drawer.getByRole('button', { name: 'Annotate interactions', exact: true }).click();
  await drawer.getByRole('button', { name: 'Convert to task' }).click();
  await expect(page.getByText(/^Converted to WEB-\d+$/)).toBeVisible();
  await expect(page.getByRole('dialog', { name: `Task: ${TASK}` })).toBeVisible();
  await expect(drawer.getByText('3/3')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Annotate interactions' })).toHaveCount(1);

  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Task: Annotate interactions' })).toBeVisible();
});

test('deleting a subtask from its view removes it', async ({ page }) => {
  const drawer = page.getByRole('dialog', { name: /^(Task|Subtask): / });
  await openFromList(page, TASK);
  await drawer.getByRole('button', { name: 'Mobile layout', exact: true }).click();
  await drawer.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('dialog', { name: `Task: ${TASK}` })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Mobile layout', exact: true })).toHaveCount(0);
  await expect(drawer.getByText('2/3')).toBeVisible();
  await page.reload();
  await expect.poll(() => subtitles(page)).toEqual(['Desktop layout', 'Tablet layout', 'Annotate interactions']);
});

test('subtasks move with the arrow keys on their handle, and the order persists', async ({ page }) => {
  const drawer = await openFromList(page, TASK);
  const handle = drawer.getByRole('button', { name: 'Reorder Desktop layout' });
  await handle.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(handle).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => subtitles(page)).toEqual(['Tablet layout', 'Mobile layout', 'Desktop layout', 'Annotate interactions']);
  await page.reload();
  await expect.poll(() => subtitles(page)).toEqual(['Tablet layout', 'Mobile layout', 'Desktop layout', 'Annotate interactions']);
});

test('subtasks reorder by dragging with the mouse', async ({ page }) => {
  const drawer = await openFromList(page, TASK);
  const handle = drawer.getByRole('button', { name: 'Reorder Annotate interactions' });
  await drawer.getByRole('button', { name: 'Annotate interactions', exact: true }).hover();
  const from = await handle.boundingBox();
  const to = await drawer.getByRole('button', { name: 'Desktop layout', exact: true }).boundingBox();
  if (!from || !to) throw new Error('subtask rows not laid out');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y - 10, { steps: 4 });
  await page.mouse.move(from.x + from.width / 2, to.y + 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => subtitles(page)).toEqual(['Annotate interactions', 'Desktop layout', 'Tablet layout', 'Mobile layout']);
});
