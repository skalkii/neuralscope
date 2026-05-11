import { test, expect } from '@playwright/test';

test.describe('NeuralScope smoke', () => {
  test('homepage loads with hero overlay and sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NeuralScope/);
    await expect(
      page.getByRole('heading', { name: 'NeuralScope', level: 2 }),
    ).toBeVisible();
    await expect(page.getByText(/Drop \.onnx here/i)).toBeVisible();
    await expect(page.getByText('MNIST CNN')).toBeVisible();
  });

  test('clicking MNIST CNN loads the model and shows MNIST input', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: /Load example model MNIST CNN/i })
      .click();

    const runButton = page.getByRole('button', { name: /Run inference/i });
    await expect(runButton).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/MNIST 28×28/i)).toBeVisible();
  });

  test('engine toggle reflects WASM by default', async ({ page }) => {
    await page.goto('/');
    const wasmButton = page.getByRole('button', { name: 'WASM' });
    await expect(wasmButton).toBeVisible();
    await expect(wasmButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('hero overlay disappears once a model is loaded', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'NeuralScope', level: 2 }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: /Load example model MNIST CNN/i })
      .click();
    await expect(
      page.getByRole('heading', { name: 'NeuralScope', level: 2 }),
    ).toHaveCount(0, { timeout: 30_000 });
  });
});
