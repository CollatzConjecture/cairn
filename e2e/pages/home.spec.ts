import { expect, test } from '../fixtures';
import { main, saved, toast, visit } from './helpers';

test('home greets the user and its stats open the matching lists', async ({ page }) => {
  await visit(page, '/home');
  await expect(page.getByRole('heading', { level: 1, name: 'Good afternoon, Jerry' })).toBeVisible();
  await expect(main(page).getByText('Wednesday, October 7')).toBeVisible();
  await page.getByRole('button', { name: /^Overdue 2/ }).click();
  await expect(page).toHaveURL(/\/tasks$/);
});

test('my tasks tabs switch between upcoming, overdue and completed', async ({ page }) => {
  await visit(page, '/home');
  const panel = page.getByRole('region', { name: 'My tasks' });
  const rows = panel.getByRole('checkbox', { name: /^Complete / });
  await expect(panel.getByRole('tab', { name: 'Upcoming 6' })).toHaveAttribute('aria-selected', 'true');
  await expect(rows).toHaveCount(6);

  await panel.getByRole('tab', { name: /^Overdue/ }).click();
  await expect(panel.getByRole('tab', { name: /^Overdue/ })).toHaveAttribute('aria-selected', 'true');
  await expect(rows).toHaveCount(1);

  await panel.getByRole('tab', { name: /^Completed/ }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toBeChecked();
});

test('completing a task from home moves it to completed and persists', async ({ page }) => {
  await visit(page, '/home');
  const panel = page.getByRole('region', { name: 'My tasks' });
  await panel.getByRole('checkbox', { name: 'Complete Prepare design system tokens' }).click();
  await expect(toast(page, 'Completed “Prepare design system tokens”')).toBeVisible();
  await expect(panel.getByRole('tab', { name: 'Upcoming 5' })).toBeVisible();
  await expect(panel.getByRole('tab', { name: 'Completed 2' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Prepare design system tokens', exact: true })).toHaveCount(0);

  await page.reload();
  await panel.getByRole('tab', { name: 'Completed 2' }).click();
  await expect(panel.getByRole('checkbox', { name: 'Complete Prepare design system tokens' })).toBeChecked();
  const t = (await saved(page)).data.tasks.find((x: { title: string }) => x.title === 'Prepare design system tokens');
  expect(t.status).toBe('done');
});

test('completing a recurring task from home schedules its next occurrence', async ({ page }) => {
  await visit(page, '/home');
  const panel = page.getByRole('region', { name: 'My tasks' });
  await panel.getByRole('checkbox', { name: 'Complete Triage beta tester feedback' }).click();
  await expect(panel.getByRole('tab', { name: 'Completed 2' })).toBeVisible();
  await expect(panel.getByRole('tab', { name: 'Upcoming 6' })).toBeVisible();
});

test('a task title on home opens the drawer', async ({ page }) => {
  await visit(page, '/home');
  await page.getByRole('region', { name: 'My tasks' }).getByRole('button', { name: 'Triage beta tester feedback', exact: true }).click();
  await expect(page.getByRole('dialog', { name: /Triage beta tester feedback/ })).toBeVisible();
});
