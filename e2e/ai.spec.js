import { test, expect } from '@playwright/test';

test.describe('AI Features', () => {
  test('should redirect to login when accessing AI without auth', async ({ page }) => {
    await page.goto('/room/test');
    await page.waitForURL('**/login');
  });
});
