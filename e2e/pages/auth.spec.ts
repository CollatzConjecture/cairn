import { expect, test } from '../fixtures';
import { toast } from './helpers';

test('login validates the email and password, then signs in to the start page', async ({ page }) => {
  await page.goto('/login');
  const email = page.getByLabel('Email');
  const pw = page.getByLabel('Password', { exact: true });
  await expect(email).toHaveValue('hello@example.com');

  await email.fill('');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter your email address')).toBeVisible();
  await expect(page.getByText('Enter your password')).toBeVisible();
  await expect(email).toHaveAttribute('aria-invalid', 'true');

  await email.fill('alex@');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter a valid email, like name@company.com')).toBeVisible();

  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(pw).toHaveAttribute('type', 'text');
  await email.fill('alex@example.com');
  await pw.fill('secret');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(toast(page, 'Signed in as alex@example.com')).toBeVisible();
});

test('social sign-in enters the app', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(toast(page, 'Signed in with Google')).toBeVisible();
});

test('sign up validates each field, shows password strength, and continues to verification', async ({ page }) => {
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter your name')).toBeVisible();
  await expect(page.getByText('Enter a valid work email')).toBeVisible();
  await expect(page.getByText('Use at least 10 characters, including a number or symbol')).toBeVisible();

  await page.getByLabel('Full name').fill('Alex Kim');
  await page.getByLabel('Work email').fill('alex@company.com');
  await page.getByLabel('Password').fill('abcdefgh1');
  await expect(page.getByText('Password strength: Fair')).toBeVisible();
  await page.getByLabel('Password').fill('correct-horse-9');
  await expect(page.getByText('Password strength: Strong')).toBeVisible();
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
  await expect(page.getByText('alex@company.com')).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend email in \d+ s/ })).toBeDisabled();
  await page.getByRole('button', { name: "I've verified my email" }).click();
  await expect(page).toHaveURL(/\/onboarding\/0$/);
});

test('verify: resend is available once the countdown ends, and "Change it" goes back to sign up', async ({ page }) => {
  await page.goto('/verify');
  await page.getByRole('button', { name: 'Resend email', exact: true }).click();
  await expect(toast(page, 'Verification email sent to hello@example.com')).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend email in \d+ s/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Change it' }).click();
  await expect(page).toHaveURL(/\/signup$/);
});

test('forgot password, reset link, and choosing a new password', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();

  await page.getByLabel('Email').fill('nope');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('Enter the email you use to sign in')).toBeVisible();
  await page.getByLabel('Email').fill('sam@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();

  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByText('sam@example.com')).toBeVisible();
  await page.getByRole('button', { name: 'Resend email' }).click();
  await expect(toast(page, 'Reset link sent to sam@example.com')).toBeVisible();
  await page.getByRole('button', { name: 'Open reset link' }).click();

  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  await expect(page.getByText('for sam@example.com')).toBeVisible();
  await page.getByLabel('New password').fill('short');
  await page.getByLabel('Confirm password').fill('different');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText('Use at least 10 characters, including a number or symbol')).toBeVisible();
  await expect(page.getByText("Passwords don't match")).toBeVisible();

  await page.getByLabel('New password').fill('a-new-password-7');
  await page.getByLabel('Confirm password').fill('a-new-password-7');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByRole('heading', { name: 'Password updated' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('the theme toggle on auth screens switches dark mode', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
});
