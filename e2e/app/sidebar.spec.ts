import { expect, test } from '../fixtures';

test('collapsing the sidebar leaves icons only, persists across reload, and expands again', async ({ page }) => {
  await page.goto('/home');
  const sidebar = page.locator('[data-slot=sidebar][data-state]');
  const container = page.locator('[data-slot=sidebar-container]');
  await expect(sidebar).toHaveAttribute('data-state', 'expanded');
  expect((await container.boundingBox())?.width).toBe(252);

  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  await expect(page.getByText('Workspace', { exact: true })).toBeHidden();
  await expect.poll(async () => (await container.boundingBox())?.width).toBe(52);

  await page.reload();
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(sidebar).toHaveAttribute('data-state', 'expanded');
  await expect(page.getByText('Workspace', { exact: true })).toBeVisible();
});
