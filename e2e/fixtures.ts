import { test as base, expect } from '@playwright/test';

/** The harness clock: Wednesday 2026-10-07, 2:30 pm in Los Angeles. Seed dates are relative to it. */
export const NOW = new Date('2026-10-07T14:30:00-07:00');

/**
 * Every spec imports `test` and `expect` from here, not from @playwright/test. Each test gets:
 * - a frozen clock (`NOW`) and storage cleared once per test (a reload keeps what the test saved),
 * - a failure if the page logs a console error or throws.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', m => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', e => errors.push(e.message));
      await use(errors);
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(NOW);
    await page.addInitScript(() => {
      if (sessionStorage.getItem('e2e-cleared')) return;
      localStorage.clear();
      sessionStorage.setItem('e2e-cleared', '1');
    });
    await use(page);
  },
});

export { expect };
