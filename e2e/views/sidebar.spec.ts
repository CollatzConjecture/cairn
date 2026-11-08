import { expect, test } from '../fixtures';

const sidebarProjects = (page: import('@playwright/test').Page) =>
  page.locator('[data-proj-drop]').evaluateAll(items => items.map(i => i.querySelector('[data-drag-proj]')?.textContent?.trim() ?? ''));

test('on a fresh load of Home, dragging a sidebar project reorders the projects, and the order persists', async ({ page }) => {
  await page.goto('/home');
  await expect(page.locator('[data-proj-drop]').first()).toBeVisible();
  expect((await sidebarProjects(page)).slice(0, 3)).toEqual(['Website Redesign', 'Mobile App', 'Marketing Campaign']);

  const target = page.locator('[data-proj-drop]').filter({ hasText: 'Mobile App' });
  await page
    .locator('[data-drag-proj]')
    .filter({ hasText: 'Product Launch' })
    .dragTo(target, { targetPosition: { x: 40, y: 4 } });
  await expect.poll(async () => (await sidebarProjects(page)).slice(0, 4)).toEqual(['Website Redesign', 'Product Launch', 'Mobile App', 'Marketing Campaign']);

  await page.reload();
  await expect(page.locator('[data-proj-drop]').first()).toBeVisible();
  expect((await sidebarProjects(page)).slice(0, 4)).toEqual(['Website Redesign', 'Product Launch', 'Mobile App', 'Marketing Campaign']);
});
