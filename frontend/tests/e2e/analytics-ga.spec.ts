import { test, expect } from '@playwright/test';

test.describe('Analytics event stub', () => {
  test('logs page_view event calls', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag = (
        ...args: unknown[]
      ) => {
        void args;
      };
      (window as unknown as Record<string, unknown>)._gaTrackingId = 'G-TEST123';
    });
    await page.goto('/overview');
    await expect(page.getByText('Position Draft Distribution')).toBeVisible();
  });
});
