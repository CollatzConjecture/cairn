import { expect, test } from '../fixtures';
import { main, visit } from './helpers';

test('typing a query lists matches by category and the tabs narrow them', async ({ page }) => {
  await visit(page, '/search');
  const box = page.getByRole('searchbox', { name: 'Search' });
  await box.fill('homepage');
  await expect(main(page).getByRole('region', { name: 'Tasks' })).toBeVisible();
  await expect(main(page).getByRole('button', { name: 'Create homepage wireframes' })).toBeVisible();
  await expect(main(page).getByRole('region', { name: 'Files' })).toBeVisible();

  await page.getByRole('tab', { name: /^Files/ }).click();
  await expect(main(page).getByRole('region', { name: 'Files' })).toBeVisible();
  await expect(main(page).getByRole('region', { name: 'Tasks' })).toHaveCount(0);

  await page.getByRole('tab', { name: /^People/ }).click();
  await expect(main(page).getByRole('region')).toHaveCount(0);
});

test('people results link to profiles and a recent search fills the box', async ({ page }) => {
  await visit(page, '/search');
  await main(page).getByRole('button', { name: 'wireframes' }).click();
  await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('wireframes');
  await expect(page.getByRole('searchbox', { name: 'Search' })).toBeFocused();

  await page.getByRole('searchbox', { name: 'Search' }).fill('sarah');
  await main(page)
    .getByRole('link', { name: /Sarah Chen/ })
    .click();
  await expect(page).toHaveURL(/\/members\/m2$/);
});

test('no matches shows the empty state and clearing resets the search', async ({ page }) => {
  await visit(page, '/search');
  await page.getByRole('searchbox', { name: 'Search' }).fill('zzzqqq');
  await expect(main(page).getByRole('heading', { name: 'No results found' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
  await expect(main(page).getByText('Recent:')).toBeVisible();
});
