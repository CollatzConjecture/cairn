import { expect, test } from '../fixtures';
import { main, saved, toast, visit } from './helpers';

test('an archived task waits in the archive and restoring brings it back', async ({ page }) => {
  await visit(page, '/home');
  await page.getByRole('region', { name: 'My tasks' }).getByRole('button', { name: 'Go / no-go meeting', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Archive' }).click();

  await visit(page, '/archive');
  await expect(page.getByRole('tab', { name: 'Tasks 1' })).toHaveAttribute('aria-selected', 'true');
  await expect(main(page).getByText('Go / no-go meeting')).toBeVisible();
  await page.getByRole('button', { name: 'Restore Go / no-go meeting' }).click();
  await expect(toast(page, 'Restored “Go / no-go meeting”')).toBeVisible();
  await expect(main(page).getByRole('heading', { name: 'No archived tasks' })).toBeVisible();

  await page.reload();
  const t = (await saved(page)).data.tasks.find((x: { title: string }) => x.title === 'Go / no-go meeting');
  expect(t.archived).toBe(false);
});

test('an archived project can be restored from the projects tab', async ({ page }) => {
  await visit(page, '/projects');
  await main(page).getByRole('link', { name: 'Marketing Website' }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: /Archive/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Archive project' }).click();
  await expect(main(page).getByRole('link', { name: 'Marketing Website' })).toHaveCount(0);

  await visit(page, '/archive');
  await page.getByRole('tab', { name: 'Projects 1' }).click();
  await page.getByRole('button', { name: 'Restore Marketing Website' }).click();
  await expect(toast(page, 'Restored Marketing Website')).toBeVisible();
  await expect(main(page).getByRole('heading', { name: 'No archived projects' })).toBeVisible();
});

test('deleting an archived task permanently asks first', async ({ page }) => {
  await visit(page, '/home');
  await page.getByRole('region', { name: 'My tasks' }).getByRole('button', { name: 'Go / no-go meeting', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await visit(page, '/archive');
  await page.getByRole('button', { name: 'Delete Go / no-go meeting permanently' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete permanently' }).click();
  await expect(toast(page, 'Deleted “Go / no-go meeting”')).toBeVisible();
  await page.reload();
  expect((await saved(page)).data.tasks.some((x: { title: string }) => x.title === 'Go / no-go meeting')).toBe(false);
});
