import { expect, test } from '../fixtures';
import { main, saved, toast, visit } from './helpers';

test('members tabs show the directory, the teams, and the role matrix', async ({ page }) => {
  await visit(page, '/members');
  await expect(main(page).getByRole('link', { name: /Sarah Chen/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Teams' }).click();
  await expect(main(page).getByRole('link', { name: 'Design', exact: true })).toBeVisible();
  await expect(main(page).getByText('4 teams')).toBeVisible();

  await page.getByRole('tab', { name: 'Roles & permissions' }).click();
  const perms = main(page).getByRole('table', { name: 'Role permissions' });
  await expect(perms.getByRole('row').filter({ hasText: 'Billing' }).getByLabel('Allowed', { exact: true })).toHaveCount(1);
});

test('the directory filters by search and role', async ({ page }) => {
  await visit(page, '/members');
  await page.getByRole('searchbox', { name: 'Search members' }).fill('lena');
  await expect(main(page).getByRole('link', { name: /Lena Fischer/ })).toBeVisible();
  await expect(main(page).getByRole('link', { name: /Sarah Chen/ })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search members' }).fill('');
  await page.getByRole('tab', { name: 'Guest' }).click();
  await expect(main(page).getByRole('link', { name: /Diego Alvarez/ })).toBeVisible();
  await expect(main(page).getByRole('link', { name: /Lena Fischer/ })).toHaveCount(0);
});

test('changing a role applies and persists', async ({ page }) => {
  await visit(page, '/members');
  const row = main(page).getByRole('row').filter({ hasText: 'Sarah Chen' });
  await row.getByRole('button', { name: 'Role: Admin' }).click();
  await page.getByRole('menuitemradio', { name: /^Member/ }).click();
  await expect(toast(page, 'Sarah Chen is now a Member')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Role: Member' })).toBeVisible();
  await page.reload();
  await expect(main(page).getByRole('row').filter({ hasText: 'Sarah Chen' }).getByRole('button', { name: 'Role: Member' })).toBeVisible();
});

test('removing a member confirms, removes them, and offers undo', async ({ page }) => {
  await visit(page, '/members');
  await page.getByRole('button', { name: 'Options for Diego Alvarez' }).click();
  await page.getByRole('menuitem', { name: 'Remove from workspace' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove member' }).click();
  await expect(toast(page, 'Removed Diego Alvarez')).toBeVisible();
  await expect(main(page).getByRole('link', { name: /Diego Alvarez/ })).toHaveCount(0);
  await page.reload();
  expect((await saved(page)).data.members.some((m: { name: string }) => m.name === 'Diego Alvarez')).toBe(false);
});

test('creating a team opens its page with the chosen members', async ({ page }) => {
  await visit(page, '/teams');
  await main(page).getByRole('button', { name: 'New team' }).click();
  const dlg = page.getByRole('dialog', { name: 'New team' });
  await dlg.getByRole('button', { name: 'Create team' }).click();
  await expect(dlg.getByText('Give the team a name')).toBeVisible();

  await dlg.getByLabel('Team name').fill('Growth');
  await dlg.getByLabel('What does this team own?').fill('Acquisition experiments');
  await dlg.getByRole('radio', { name: 'rocket' }).click();
  await dlg.getByRole('checkbox', { name: /Priya Patel/ }).click();
  await dlg.getByRole('button', { name: 'Create team' }).click();

  await expect(toast(page, 'Created Growth')).toBeVisible();
  await expect(page).toHaveURL(/\/teams\/tm/);
  await expect(main(page).getByRole('heading', { level: 1, name: 'Growth' })).toBeVisible();
  await expect(main(page).getByRole('link', { name: 'Priya Patel' })).toBeVisible();
});

test('editing a team renames it, and a duplicate name is refused', async ({ page }) => {
  await visit(page, '/teams/design');
  await page.getByRole('button', { name: 'Edit team' }).click();
  const dlg = page.getByRole('dialog', { name: 'Edit team' });
  await dlg.getByLabel('Team name').fill('Marketing');
  await dlg.getByRole('button', { name: 'Save changes' }).click();
  await expect(dlg.getByText('A team called “Marketing” already exists')).toBeVisible();

  await dlg.getByLabel('Team name').fill('Product Design');
  await dlg.getByRole('button', { name: 'Save changes' }).click();
  await expect(toast(page, 'Saved Product Design')).toBeVisible();
  await expect(main(page).getByRole('heading', { level: 1, name: 'Product Design' })).toBeVisible();
  await page.reload();
  await expect(main(page).getByRole('heading', { level: 1, name: 'Product Design' })).toBeVisible();
});
