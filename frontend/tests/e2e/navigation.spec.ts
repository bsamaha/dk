import { test, expect } from '@playwright/test';

test.describe('Navigation and basic flows', () => {
  test('navigates between main views', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.getByText('Position Draft Distribution')).toBeVisible();

    await page.getByRole('link', { name: 'Players' }).click();
    await expect(page.getByText('Player Search & Filters')).toBeVisible();

    await page.getByRole('link', { name: 'Analytics' }).click();
    await expect(page.getByText('Draft Slot')).toBeVisible();

    await page.getByRole('link', { name: 'Combinations' }).click();
    await expect(page.getByText('Player Combinations')).toBeVisible();
  });
});
