import { expect, test } from '../fixtures';
import { openFromList, saved } from './helpers';

const TASK = 'Create homepage wireframes';

test('comments show their author, mentions and reactions', async ({ page }) => {
  const drawer = await openFromList(page, TASK);
  await expect(drawer.getByText('@Jerry Lucas')).toBeVisible();
  await expect(drawer.getByRole('button', { name: '👍 2' })).toHaveAttribute('aria-pressed', 'false');
  await expect(drawer.getByRole('button', { name: '🎉 1' })).toBeVisible();
});

test('posting a comment with the button or Ctrl+Enter adds it and clears the box', async ({ page }) => {
  const drawer = await openFromList(page, TASK);
  const box = drawer.getByRole('textbox', { name: 'Comment' });
  await drawer.getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(box).toBeFocused();
  await expect(drawer.getByRole('tab', { name: 'Comments 3' })).toBeVisible();

  await box.fill('Looks good to me');
  await drawer.getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(drawer.getByText('Looks good to me')).toBeVisible();
  await expect(box).toHaveValue('');
  await box.fill('Shipping Thursday');
  await box.press('Control+Enter');
  await expect(drawer.getByText('Shipping Thursday')).toBeVisible();
  await expect(drawer.getByRole('tab', { name: 'Comments 5' })).toBeVisible();

  await page.reload();
  const again = await openFromList(page, TASK);
  await expect(again.getByText('Shipping Thursday')).toBeVisible();
});

test('typing @ suggests members; picking one completes the mention', async ({ page }) => {
  const drawer = await openFromList(page, TASK);
  const box = drawer.getByRole('textbox', { name: 'Comment' });
  const suggestions = drawer.getByRole('group', { name: 'Mention suggestions' });
  await box.pressSequentially('Thanks @sa');
  await expect(suggestions.getByRole('button')).toHaveText([/Sarah Chen/]);
  await suggestions.getByRole('button', { name: /Sarah Chen/ }).click();
  await expect(box).toHaveValue('Thanks @Sarah Chen ');
  await expect(box).toBeFocused();
  await page.keyboard.type('please review');
  await page.keyboard.press('Control+Enter');
  const posted = drawer.getByText('Thanks @Sarah Chen please review');
  await expect(posted).toBeVisible();
  await expect(posted.getByText('@Sarah Chen')).toBeVisible();

  // The @ button starts a mention; Escape closes the list but keeps the drawer.
  await drawer.getByRole('button', { name: 'Mention' }).click();
  await expect(box).toHaveValue('@');
  await expect(suggestions.getByRole('button', { name: /Emma Wilson/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(suggestions).toBeHidden();
  await expect(drawer).toBeVisible();
});

test('reactions toggle, and the picker adds a new one', async ({ page }) => {
  const drawer = await openFromList(page, TASK);
  await drawer.getByRole('button', { name: '👍 2' }).click();
  await expect(drawer.getByRole('button', { name: '👍 3' })).toHaveAttribute('aria-pressed', 'true');
  await drawer.getByRole('button', { name: '👍 3' }).click();
  await expect(drawer.getByRole('button', { name: '👍 2' })).toHaveAttribute('aria-pressed', 'false');

  await drawer.getByRole('button', { name: 'Add reaction' }).first().click();
  await page.getByRole('button', { name: 'React 🚀' }).click();
  await expect(page.getByRole('button', { name: 'React 🚀' })).toBeHidden();
  await expect(drawer.getByRole('button', { name: '🚀 1' })).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  const c1 = (await saved(page)).data.comments.find((c: { id: string }) => c.id === 'c1');
  expect(c1.re['🚀']).toEqual(['m1']);
});

test('your own comment can be deleted, with undo', async ({ page }) => {
  const drawer = await openFromList(page, TASK);
  await expect(drawer.getByRole('button', { name: 'Delete comment' })).toHaveCount(0);
  await drawer.getByRole('textbox', { name: 'Comment' }).fill('Typo, ignore');
  await drawer.getByRole('textbox', { name: 'Comment' }).press('Control+Enter');
  await drawer.getByRole('button', { name: 'Delete comment' }).click();
  await expect(drawer.getByText('Typo, ignore')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(drawer.getByText('Typo, ignore')).toBeVisible();
});

test('the clip in the comment box attaches files to the task', async ({ page }) => {
  const drawer = await openFromList(page, TASK);
  await drawer
    .getByRole('button', { name: 'Attach file' })
    .locator('input[type=file]')
    .setInputFiles({
      name: 'review-notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('notes'),
    });
  await expect(drawer.getByRole('button', { name: 'review-notes.txt', exact: true })).toBeVisible();
  await expect(drawer.getByRole('tab', { name: /^Activity/ })).toBeVisible();
});
