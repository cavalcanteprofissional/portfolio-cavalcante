import { test, expect } from '@playwright/test';

async function ensureNavVisible(page: import('@playwright/test').Page) {
  const isDesktop = await page.evaluate(() => window.innerWidth >= 768);
  if (!isDesktop) {
    await page.locator('button[aria-label="Toggle menu"]').click();
    await page.waitForTimeout(400);
  }
}

test.describe('Portfolio - Navegação e Layout', () => {

  test('deve carregar a página com título correto', async ({ page }) => {
    await page.goto('/portfolio/');
    await expect(page).toHaveTitle(/Lucas Cavalcante/);
  });

  test('deve exibir o nome no Hero', async ({ page }) => {
    await page.goto('/portfolio/');
    await expect(page.locator('text=Lucas Cavalcante').first()).toBeVisible();
  });

  test('deve ter navegação com todos os links', async ({ page }) => {
    await page.goto('/portfolio/');
    await ensureNavVisible(page);
    const nav = page.locator('nav');
    await expect(nav.locator('text=Projetos').last()).toBeVisible();
    await expect(nav.locator('text=Habilidades').last()).toBeVisible();
    await expect(nav.locator('text=Showcase').last()).toBeVisible();
  });

  test('deve alternar tema ao clicar no botão', async ({ page }) => {
    await page.goto('/portfolio/');
    const html = page.locator('html');
    const initial = await html.getAttribute('class');
    await page.locator('button[aria-label="Toggle theme"]').click();
    const after = await html.getAttribute('class');
    expect(after).not.toBe(initial);
  });

  test('deve trocar idioma para inglês', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.locator('button[aria-label="Select language"]').click();
    await page.locator('text=English').click();
    await ensureNavVisible(page);
    await expect(page.getByRole('link', { name: 'Projects' }).last()).toBeVisible();
  });

  test('deve trocar idioma para espanhol', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.locator('button[aria-label="Select language"]').click();
    await page.locator('text=Español').click();
    await ensureNavVisible(page);
    await expect(page.getByRole('link', { name: 'Proyectos' }).last()).toBeVisible();
  });

  test('seções principais devem estar visíveis', async ({ page }) => {
    await page.goto('/portfolio/');
    await expect(page.locator('#hero')).toBeVisible();
    await expect(page.locator('#showcase')).toBeVisible();
    await expect(page.locator('#experience')).toBeVisible();
    await expect(page.locator('#projects')).toBeVisible();
    await expect(page.locator('#skills')).toBeVisible();
    await expect(page.locator('#certifications')).toBeVisible();
    await expect(page.locator('#languages')).toBeVisible();
    await expect(page.locator('#faq')).toBeVisible();
    await expect(page.locator('#contact')).toBeVisible();
  });

  test('projetos devem ter links de demo e código', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.locator('#projects').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const section = page.locator('#projects');
    const demoLinks = section.locator('a[target="_blank"]');
    const count = await demoLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('footer deve ter links sociais', async ({ page }) => {
    await page.goto('/portfolio/');
    const footer = page.locator('footer');
    const links = footer.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('FAQ deve abrir e fechar itens', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.locator('#faq').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const firstButton = page.locator('#faq button').first();
    await firstButton.click();
    await expect(firstButton).toHaveAttribute('aria-expanded', 'false');
    await firstButton.click();
    await expect(firstButton).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('Portfolio - Responsividade', () => {

  test('menu mobile deve abrir e fechar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/portfolio/');
    await page.locator('button[aria-label="Toggle menu"]').click();
    await expect(page.getByRole('link', { name: 'Experiência' })).toBeVisible();
    await page.locator('button[aria-label="Toggle menu"]').click();
    await expect(page.getByRole('link', { name: 'Experiência' })).not.toBeVisible();
  });

  test('botão scroll-to-top deve aparecer após rolar', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await expect(page.locator('button[aria-label="Voltar ao topo"]')).toBeVisible();
  });
});

test.describe('Portfolio - Toggle Dev/Marketing', () => {

  test('deve alternar entre Dev e Marketing pelo toggle', async ({ page }) => {
    await page.goto('/portfolio/');
    const toggleBtn = page.locator('button[aria-label="Abrir portfólio Marketing"]');
    await expect(toggleBtn).toBeVisible();

    await toggleBtn.click();
    await page.waitForTimeout(1200);
    await expect(page.locator('html.theme-marketing')).toBeVisible();

    const toggleBackBtn = page.locator('button[aria-label="Open Dev portfolio"]');
    await toggleBackBtn.click();
    await page.waitForTimeout(1200);
    await expect(page.locator('html.theme-marketing')).not.toBeVisible();
  });

  test('toggle deve mostrar indicador correto para cada portfolio', async ({ page }) => {
    await page.goto('/portfolio/');
    const toggle = page.locator('button[aria-label="Abrir portfólio Marketing"]');
    await expect(toggle).toContainText('Dev');
    await toggle.click();
    await page.waitForTimeout(1200);
    await expect(page.locator('button[aria-label="Open Dev portfolio"]')).toContainText('Marketing');
  });
});

test.describe('Portfolio - Scroll Snap', () => {

  test('scroll deve ter snap entre seções', async ({ page }) => {
    await page.goto('/portfolio/');
    const html = page.locator('html');
    const snapType = await html.evaluate((el) => getComputedStyle(el).scrollSnapType);
    expect(snapType).toContain('y');
  });

  test('spacers de seção devem ocupar viewport', async ({ page }) => {
    await page.goto('/portfolio/');
    const vh = await page.evaluate(() => window.innerHeight);
    const spacers = page.locator('.h-screen');
    const count = await spacers.count();
    expect(count).toBeGreaterThanOrEqual(5);
    const firstH = await spacers.first().evaluate((el) => el.getBoundingClientRect().height);
    expect(Math.abs(firstH - vh)).toBeLessThan(5);
  });

  test('scroll horizontal da experiência deve ter indicadores de página', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.locator('#experience').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const indicators = page.locator('#experience button[aria-label^="Go to page"]');
    const count = await indicators.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Portfolio - Conteúdo 3D', () => {

  test('canvas 3D deve estar presente', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.waitForTimeout(2000);
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible();
  });

  test('mudar para marketing mantém canvas 3D', async ({ page }) => {
    await page.goto('/portfolio/');
    const canvasBefore = page.locator('canvas');
    await expect(canvasBefore.first()).toBeVisible();

    await page.locator('button[aria-label="Abrir portfólio Marketing"]').click();
    await page.waitForTimeout(1500);

    const canvasAfter = page.locator('canvas');
    await expect(canvasAfter.first()).toBeVisible();
  });

  test('conteúdo Html 3D da seção Hero deve ser visível', async ({ page }) => {
    await page.goto('/portfolio/');
    await page.waitForTimeout(2000);
    const heroName = page.locator('text=Lucas Cavalcante').first();
    await expect(heroName).toBeVisible();
  });
});
