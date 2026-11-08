import { expect, test } from '../fixtures';

const ROUTES = [
  ...'/ /home /inbox /my-tasks /favorites /notifications /search /overview /projects /tasks /calendar /timeline /members /members/m2 /teams /teams/design /activity /design-system /states /archive /nope'.split(
    ' ',
  ),
  ...'overview board list table calendar timeline files activity'.split(' ').map(t => `/projects/p1/${t}`),
  ...'workspace appearance language datetime members teams projects permissions notif-email notif-push notif-mentions notif-assign profile preferences shortcuts'
    .split(' ')
    .map(s => `/settings/${s}`),
  ...'login signup forgot forgot/sent reset reset/done verify'.split(' ').map(a => `/${a}`),
  ...[0, 1, 2, 3, 4, 5].map(i => `/onboarding/${i}`),
];

for (const url of ROUTES)
  test(`${url} renders a heading without console errors`, async ({ page }) => {
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });
