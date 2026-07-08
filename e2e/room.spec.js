import { test, expect } from '@playwright/test';

test.describe('Room Editor', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/room/test-room-id');
    await page.waitForURL('**/login');
    await expect(page.url()).toContain('/login');
  });
});
