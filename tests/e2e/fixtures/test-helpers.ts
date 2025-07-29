import { test as base, expect } from '@playwright/test';

export { expect };

export const test = base.extend({
});

export async function fillSignInForm(page, email: string) {
  await page.goto('/auth/signin');
  await page.fill('input[type="email"]', email);
  await page.click('button[type="submit"]');
}

export async function cleanupTestData() {
}
