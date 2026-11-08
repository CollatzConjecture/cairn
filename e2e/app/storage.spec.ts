/// <reference types="node" />
import fs from 'node:fs';
import { expect, test } from '../fixtures';

/** Written by the original JavaScript app itself: p1 renamed, t1 moved to Review, dark theme, teal accent, sidebar collapsed. */
const save = fs.readFileSync(new URL('../fixtures/original-app-save.json', import.meta.url), 'utf8');

test('a gr8r.v2 save from the original JavaScript app loads: data, preferences and the collapsed sidebar', async ({ page }) => {
  await page.addInitScript(raw => localStorage.setItem('gr8r.v2', raw), save);
  await page.goto('/projects/p1/list');

  const html = page.locator('html');
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(html).toHaveAttribute('data-accent', 'teal');
  await expect(page.locator('[data-slot=sidebar][data-state]')).toHaveAttribute('data-state', 'collapsed');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Saved Blob Project' })).toBeAttached();
  await expect(page.getByRole('row').filter({ hasText: 'Audit existing navigation' }).getByRole('button', { name: 'Status: Review' })).toBeVisible();
});
