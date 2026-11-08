import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { drag, keyboardDrag } from './helpers';

const day = (page: Page, iso: string) => page.locator(`[data-day="${iso}"]`);
const label = (page: Page) => page.getByRole('heading', { level: 2 }).filter({ hasText: /\d{4}/ });

test('month and week ranges navigate with Previous, Next and Today', async ({ page }) => {
  await page.goto('/projects/p1/calendar');
  await expect(label(page)).toHaveText('October 2026');
  await expect(page.locator('[aria-current="date"]')).toHaveText('7');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(label(page)).toHaveText('November 2026');
  await page.getByRole('button', { name: 'Previous' }).click();
  await page.getByRole('button', { name: 'Previous' }).click();
  await expect(label(page)).toHaveText('September 2026');
  await page.getByRole('button', { name: 'Today' }).click();
  await expect(label(page)).toHaveText('October 2026');

  await page.getByRole('button', { name: 'Week', exact: true }).click();
  await expect(label(page)).toHaveText('Oct 5 – Oct 11, 2026');
  await expect(day(page, '2026-10-08').getByRole('button', { name: 'Design review' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(label(page)).toHaveText('Oct 12 – Oct 18, 2026');
  await page.getByRole('button', { name: 'Month', exact: true }).click();
  await expect(label(page)).toHaveText('October 2026');
});

test('dragging a task to another day reschedules it and the date persists', async ({ page }) => {
  await page.goto('/projects/p1/calendar');
  await drag(page, day(page, '2026-10-07').getByRole('button', { name: 'Finalize navigation' }), day(page, '2026-10-14'));
  await expect(page.getByText('Rescheduled “Finalize navigation” to Oct 14')).toBeVisible();
  await expect(day(page, '2026-10-14').getByRole('button', { name: 'Finalize navigation' })).toBeVisible();
  await page.reload();
  await expect(day(page, '2026-10-14').getByRole('button', { name: 'Finalize navigation' })).toBeVisible();
  await expect(day(page, '2026-10-07').getByRole('button', { name: 'Finalize navigation' })).toHaveCount(0);
});

test('a task moves a day from the keyboard', async ({ page }) => {
  await page.goto('/projects/p1/calendar');
  await day(page, '2026-10-13').getByRole('button', { name: 'Prepare design system tokens' }).focus();
  await keyboardDrag(page, ['ArrowRight']);
  await expect(page.getByText('Rescheduled “Prepare design system tokens” to Oct 14')).toBeVisible();
  await expect(day(page, '2026-10-14').getByRole('button', { name: 'Prepare design system tokens' })).toBeVisible();
});

test('an event opens its details and links to its project', async ({ page }) => {
  await page.goto('/calendar');
  await day(page, '2026-10-08').getByRole('button', { name: 'Design review' }).click();
  const pop = page.getByRole('dialog');
  await expect(pop).toContainText('Website Redesign');
  await expect(pop).toContainText('10:00');
  await pop.getByRole('button', { name: 'Open project' }).click();
  await expect(page).toHaveURL(/\/projects\/p1\/overview$/);
});

test('the workspace calendar lists every project, and "+N more" shows the rest of a day', async ({ page }) => {
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: 'Calendar', level: 1 })).toBeVisible();
  const more = page.getByRole('button', { name: /^\+\d+ more$/ }).first();
  await more.click();
  const pop = page.getByRole('dialog');
  await expect(pop.getByRole('button').first()).toBeVisible();
  const n = await pop.getByRole('button').count();
  expect(n).toBeGreaterThan(3);
  await page.keyboard.press('Escape');
});

test('the add button on a day opens a new task due that day', async ({ page }) => {
  await page.goto('/projects/p1/calendar');
  await day(page, '2026-10-20').hover();
  await page.getByRole('button', { name: 'Add task on Oct 20' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Oct 20');
});
