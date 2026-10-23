import { test, expect } from '@playwright/test';

for (const width of [390, 1280]) {
  test(`hero slideshow advances and pauses at ${width}px`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/config/shop-config.json*', async (route) => {
      const response = await route.fetch();
      const config = await response.json();
      config.heroGallery = { transitionMs: 1000, fadeInMs: 100, fadeOutMs: 100 };
      await route.fulfill({ response, json: config });
    });
    await page.goto('/');
    const gallery = page.locator('.shop-hero-gallery');
    const current = gallery.locator('.shop-hero-gallery-image-current');
    await gallery.scrollIntoViewIfNeeded();
    await expect(current).toBeVisible();
    const initial = await current.getAttribute('src');
    await expect(current).not.toHaveAttribute('src', initial!);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(gallery).not.toBeInViewport();
    // Allow the observer and any pending transition to settle.
    await page.waitForTimeout(200);
    const offscreen = await current.getAttribute('src');
    await page.waitForTimeout(1200);
    await expect(current).toHaveAttribute('src', offscreen!);
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery).toBeInViewport();
    await expect(current).not.toHaveAttribute('src', offscreen!, { timeout: 15000 });

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(200);
    const hidden = await current.getAttribute('src');
    await page.waitForTimeout(1200);
    await expect(current).toHaveAttribute('src', hidden!);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(current).not.toHaveAttribute('src', hidden!);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(current).toHaveAttribute('src', initial!);
    await expect(current).toHaveCSS('animation-name', 'none');
    await page.waitForTimeout(1200);
    await expect(current).toHaveAttribute('src', initial!);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(current).not.toHaveAttribute('src', initial!);
  });
}
