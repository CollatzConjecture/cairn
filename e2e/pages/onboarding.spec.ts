import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { saved, toast } from './helpers';

const next = (page: Page) => page.getByRole('button', { name: 'Continue' }).click();
const back = (page: Page) => page.getByRole('button', { name: 'Back' }).click();
const step = (page: Page, n: number) => expect(page.getByText(`Step ${n} of 6`)).toBeVisible();

test('onboarding walks forward and back through every step and keeps each choice', async ({ page }) => {
  await page.goto('/onboarding/0');
  await step(page, 1);
  await page.getByRole('radio', { name: /Design/ }).click();
  await next(page);

  await step(page, 2);
  await expect(page).toHaveURL(/\/onboarding\/1$/);
  await next(page);
  await expect(page.getByText('Name your workspace to continue')).toBeVisible();
  await page.getByLabel('Workspace name').fill('Acme Design');
  await expect(page.getByText(`${new URL(page.url()).host}/acme-design is available`)).toBeVisible();
  await next(page);

  await step(page, 3);
  await page.getByRole('radio', { name: /Timelines/ }).click();
  await page.getByRole('tab', { name: '11-50' }).click();
  await next(page);

  await step(page, 4);
  await expect(page.getByLabel('Project name')).toHaveValue('Website Launch');
  await page.getByRole('radio', { name: /Product Development/ }).click();
  await expect(page.getByLabel('Project name')).toHaveValue('Product Development');
  await next(page);

  await step(page, 5);
  await page.getByRole('textbox', { name: 'Teammate email 1' }).fill('not-an-email');
  await page.getByRole('button', { name: 'Send invites' }).click();
  await expect(toast(page, "not-an-email isn't a valid email address")).toBeVisible();
  await page.getByRole('textbox', { name: 'Teammate email 1' }).fill('jo@acme.com');

  await back(page);
  await step(page, 4);
  await expect(page.getByRole('radio', { name: /Product Development/ })).toHaveAttribute('aria-checked', 'true');
  await back(page);
  await expect(page.getByRole('radio', { name: /Timelines/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('tab', { name: '11-50' })).toHaveAttribute('aria-selected', 'true');
  await back(page);
  await expect(page.getByLabel('Workspace name')).toHaveValue('Acme Design');
  await back(page);
  await expect(page.getByRole('radio', { name: /Design/ })).toHaveAttribute('aria-checked', 'true');

  for (let i = 0; i < 4; i++) await next(page);
  await step(page, 5);
  await expect(page.getByRole('textbox', { name: 'Teammate email 1' })).toHaveValue('jo@acme.com');
  await page.getByRole('button', { name: 'Send invites' }).click();

  await step(page, 6);
  await expect(page.getByText('Workspace “Acme Design”')).toBeVisible();
  await expect(page.getByText('Project “Product Development”')).toBeVisible();
  await expect(page.getByText('6 starter tasks · Timeline view')).toBeVisible();
  await expect(page.getByText('1 invite sent')).toBeVisible();
});

test('finishing onboarding creates the workspace, project and invites, then opens the project', async ({ page }) => {
  await page.goto('/onboarding/0');
  await next(page);
  await page.getByLabel('Workspace name').fill('Nimbus');
  await next(page);
  await page.getByRole('radio', { name: /Lists/ }).click();
  await next(page);
  await next(page);
  await page.getByRole('textbox', { name: 'Teammate email 1' }).fill('kai@nimbus.io');
  await page.getByRole('button', { name: 'Send invites' }).click();
  await page.getByRole('button', { name: 'Open workspace' }).click();

  await expect(page).toHaveURL(/\/projects\/p[a-z0-9]+\/list$/);
  await expect(toast(page, 'Welcome to Nimbus')).toBeVisible();
  const s = await saved(page);
  expect(s.data.ws.name).toBe('Nimbus');
  expect(s.prefs.defaultTab).toBe('list');
  expect(s.data.projects.some((p: { name: string }) => p.name === 'Website Launch')).toBe(true);
  expect(s.data.members.find((m: { email: string }) => m.email === 'kai@nimbus.io')).toMatchObject({ status: 'invited', name: 'Kai' });
});

test('skip clears the invites, and "Exit setup" returns to the app', async ({ page }) => {
  await page.goto('/onboarding/4');
  await page.getByRole('textbox', { name: 'Teammate email 1' }).fill('x@y.co');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await step(page, 6);
  await expect(page.getByText('No invites yet')).toBeVisible();

  await page.getByRole('button', { name: 'Exit setup' }).click();
  await expect(page).toHaveURL(/\/home$/);
});
