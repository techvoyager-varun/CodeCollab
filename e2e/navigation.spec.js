import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should navigate to login', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/login"]');
    await expect(page.url()).toContain('/login');
  });

  test('should navigate to register', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/register"]');
    await expect(page.url()).toContain('/register');
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CodeCollab/);
  });
});
