import { expect, test } from '@playwright/test';

test('NFR-009 the start page opens in Chromium', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /ShopFlow/i })).toBeVisible();
  await expect(page.getByTestId('start-page')).toBeVisible();
});
