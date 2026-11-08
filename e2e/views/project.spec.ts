import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Project views' });

test('every project tab opens its view', async ({ page }) => {
  await page.goto('/projects/p1/overview');
  const expectations: [string, RegExp, () => Promise<void>][] = [
    ['Overview', /\/overview$/, () => expect(page.getByRole('heading', { name: 'Milestones' })).toBeVisible()],
    ['Board', /\/board$/, () => expect(page.getByRole('region', { name: 'Backlog', exact: true })).toBeVisible()],
    ['List', /\/list$/, () => expect(page.getByRole('table', { name: 'Tasks' })).toBeVisible()],
    ['Table', /\/table$/, () => expect(page.getByRole('table', { name: 'Tasks table' })).toBeVisible()],
    ['Calendar', /\/calendar$/, () => expect(page.getByRole('heading', { name: 'October 2026' })).toBeVisible()],
    ['Timeline', /\/timeline$/, () => expect(page.getByRole('group', { name: 'Timeline' })).toBeVisible()],
    ['Files', /\/files$/, () => expect(page.getByRole('button', { name: 'hero-exploration.png' })).toBeVisible()],
    ['Activity', /\/activity$/, () => expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()],
  ];
  for (const [name, url, check] of expectations) {
    await tabs(page).getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(tabs(page).getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
    await check();
  }
});

test('the header favourite toggle and status picker update the project and persist', async ({ page }) => {
  await page.goto('/projects/p1/overview');
  const fav = page.getByRole('button', { name: 'Favorite' });
  await expect(fav).toHaveAttribute('aria-pressed', 'true');
  await fav.click();
  await expect(page.getByText('Removed from favorites')).toBeVisible();
  await expect(fav).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('button', { name: 'Project status: In Progress' }).click();
  await page.getByRole('menuitemradio', { name: 'At Risk' }).click();
  await expect(page.getByText('Website Redesign marked At Risk')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Project status: At Risk' })).toBeVisible();

  await page.reload();
  await expect(fav).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Project status: At Risk' })).toBeVisible();
  await tabs(page).getByRole('link', { name: 'Activity' }).click();
  await expect(page.getByText('changed status of project Website Redesign to At Risk')).toBeVisible();
});

test('an overview status count opens the list filtered to that status', async ({ page }) => {
  await page.goto('/projects/p1/overview');
  await page.getByRole('button', { name: /^In Progress\s*3$/ }).click();
  await expect(page).toHaveURL(/\/projects\/p1\/list$/);
  await expect(page.getByRole('group', { name: 'Active filters' })).toContainText('Status is In Progress');
  await expect(page.getByRole('row').filter({ has: page.getByRole('button', { name: /^Status: / }) })).toHaveCount(3);
});

test('the High priority saved view lists urgent and high tasks; views save, rename and delete', async ({ page }) => {
  await page.goto('/projects/p1/board');
  await tabs(page).getByRole('link', { name: 'High priority' }).click();
  await expect(page).toHaveURL(/\/projects\/p1\/v(:|%3A)v1$/);
  const prio = page.getByRole('row').filter({ has: page.getByRole('button', { name: /^Priority: / }) });
  await expect(prio).toHaveCount(6);
  for (const p of await prio.getByRole('button', { name: /^Priority: / }).allTextContents()) expect(p).toMatch(/High|Urgent/);

  await tabs(page).getByRole('link', { name: 'List' }).click();
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Assignee', exact: true }).click();
  await page.getByRole('group', { name: 'Assignee values' }).getByText('Emma Wilson').click();
  await page.keyboard.press('Escape');
  await tabs(page).getByRole('button', { name: 'Save view' }).click();
  await page.getByRole('textbox', { name: 'View name' }).fill('Emma');
  await page.getByRole('dialog').getByRole('button', { name: 'Save view' }).click();
  await expect(page).toHaveURL(/\/projects\/p1\/v(:|%3A)/);
  await expect(tabs(page).getByRole('link', { name: 'Emma' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('row').filter({ has: page.getByRole('button', { name: /^Status: / }) })).toHaveCount(3);

  await tabs(page).getByRole('link', { name: 'Emma' }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Rename view' }).click();
  await page.getByRole('textbox', { name: 'View name' }).fill('Emma’s work');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(tabs(page).getByRole('link', { name: 'Emma’s work' })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Emma’s work view options' }).click();
  await page.getByRole('menuitem', { name: 'Delete view' }).click();
  await expect(page.getByText('Deleted view “Emma’s work”')).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/p1\/list$/);
  await expect(tabs(page).getByRole('link', { name: 'Emma’s work' })).toHaveCount(0);
});
