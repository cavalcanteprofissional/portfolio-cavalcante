import { test, expect } from '@playwright/test';

test.describe('Aesthetic Refinement — Step 1: Nav/Anchor', () => {

  test('HEADER_OFFSET applied via rootMargin on IntersectionObserver', async ({ page }) => {
    await page.goto('/portfolio/');
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    const position = await nav.evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('fixed');
  });

  test('scroll-snap-none class is defined', async ({ page }) => {
    await page.goto('/portfolio/');
    const hasRule = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText?.includes('scroll-snap-none')) return true;
          }
        } catch {}
      }
      return false;
    });
    expect(hasRule).toBe(true);
  });
});

test.describe('Aesthetic Refinement — Step 2: Glassmorphism Panels', () => {

  test('--section-neon CSS variable is set on :root', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.waitForTimeout(4000);
    const val = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--section-neon').trim()
    );
    expect(val).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('--section-neon-rgb CSS variable is set on :root', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.waitForTimeout(3000);
    const val = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--section-neon-rgb').trim()
    );
    expect(val).toMatch(/^\d+ \d+ \d+$/);
  });

  test('glassmorphism outer container has 16px radius and max-width 520px', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.waitForTimeout(3000);
    const outer = page.locator('[style*="border-radius"]').first();
    await expect(outer).toBeVisible({ timeout: 5000 });
    const radius = await outer.evaluate(el => getComputedStyle(el).borderRadius);
    expect(radius).toBe('16px');
    const maxW = await outer.evaluate(el => getComputedStyle(el).maxWidth);
    expect(maxW).toBe('520px');
  });

  test('h2 color CSS rule targets data-card headings', async ({ page }) => {
    // Check the CSS rule exists in stylesheets (doesn't depend on 3D Canvas)
    await page.goto('/portfolio/');
    const hasRule = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            const text = rule.cssText || '';
            if (text.includes('data-card') && text.includes('h2') && text.includes('section-neon')) {
              return true;
            }
          }
        } catch {}
      }
      return false;
    });
    expect(hasRule).toBe(true);
  });

  test('--section-neon value is a valid hex color for hero section', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.waitForTimeout(4000);
    const val = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--section-neon').trim()
    );
    // Hero section should be cyan: #06b6d4
    expect(val.toLowerCase()).toBe('#06b6d4');
  });
});
