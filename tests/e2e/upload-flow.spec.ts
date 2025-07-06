import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

test.describe('CardMail Pro Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start at login page
    await page.goto('/');
  });

  test('should complete full business card processing flow', async ({ page }) => {
    // Step 1: Login (mock OAuth flow)
    await page.getByRole('button', { name: 'Googleでログイン' }).click();
    
    // Mock successful OAuth callback
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
      localStorage.setItem('auth_user', JSON.stringify({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      }));
    });
    
    await page.reload();
    
    // Step 2: Verify dashboard loads
    await expect(page.getByText('CardMail Pro')).toBeVisible();
    await expect(page.getByText('新規バッチ')).toBeVisible();
    
    // Step 3: Upload business card image
    const fileInput = page.locator('input[type="file"]');
    const sampleCardPath = resolve(__dirname, 'fixtures/sample_card.png');
    
    await fileInput.setInputFiles(sampleCardPath);
    
    // Step 4: Verify file appears in upload area
    await expect(page.getByText('sample_card.png')).toBeVisible();
    
    // Step 5: Start processing
    await page.getByRole('button', { name: 'ファイルを選択' }).click();
    
    // Step 6: Wait for OCR processing
    await expect(page.getByText('OCR実行中')).toBeVisible({ timeout: 10000 });
    
    // Step 7: Wait for email generation
    await expect(page.getByText('メール生成中')).toBeVisible({ timeout: 15000 });
    
    // Step 8: Verify processing completion
    await expect(page.getByText('送信完了')).toBeVisible({ timeout: 20000 });
    
    // Step 9: Check progress table
    await expect(page.locator('[data-testid="progress-table"]')).toBeVisible();
    await expect(page.getByRole('cell', { name: '送信完了' })).toBeVisible();
    
    // Step 10: Verify email data extracted
    const nameCell = page.locator('[data-testid="recipient-name"]');
    const emailCell = page.locator('[data-testid="recipient-email"]');
    const companyCell = page.locator('[data-testid="recipient-company"]');
    
    await expect(nameCell).not.toBeEmpty();
    await expect(emailCell).toContain('@');
    await expect(companyCell).not.toBeEmpty();
  });

  test('should handle multiple file upload', async ({ page }) => {
    // Login first
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
    });
    await page.reload();
    
    // Upload multiple files
    const fileInput = page.locator('input[type="file"]');
    const files = [
      resolve(__dirname, 'fixtures/sample_card.png'),
      resolve(__dirname, 'fixtures/sample_card.png'), // Duplicate for testing
    ];
    
    await fileInput.setInputFiles(files);
    
    // Verify multiple files shown
    await expect(page.getByText('選択されたファイル (2件)')).toBeVisible();
    
    // Start processing
    await page.getByRole('button', { name: 'ファイルを選択' }).click();
    
    // Verify multiple rows in progress table
    await expect(page.locator('[data-testid="progress-table"] tr')).toHaveCount(3); // Header + 2 rows
  });

  test('should handle OCR failure gracefully', async ({ page }) => {
    // Mock OCR failure
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'OCR processing failed' })
      });
    });
    
    // Login and upload
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
    });
    await page.reload();
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(resolve(__dirname, 'fixtures/sample_card.png'));
    
    await page.getByRole('button', { name: 'ファイルを選択' }).click();
    
    // Verify error state
    await expect(page.getByText('失敗')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('OCR processing failed')).toBeVisible();
  });

  test('should allow job retry after failure', async ({ page }) => {
    // Login
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
    });
    await page.reload();
    
    // Simulate a failed job
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-add-failed-job', {
        detail: {
          id: 'test-job-1',
          fileName: 'failed_card.png',
          status: 'failed',
          error: 'Network error'
        }
      }));
    });
    
    // Find retry button and click
    const retryButton = page.getByRole('button', { name: 'リトライ' });
    await expect(retryButton).toBeVisible();
    await retryButton.click();
    
    // Verify job status changes
    await expect(page.getByText('処理中')).toBeVisible();
  });

  test('should show job history in sidebar', async ({ page }) => {
    // Login
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
      // Add mock history
      localStorage.setItem('mail_history_1', JSON.stringify({
        id: '1',
        createdAt: new Date().toISOString(),
        totalCount: 3,
        successCount: 2,
        failedCount: 1
      }));
    });
    await page.reload();
    
    // Check sidebar history
    await expect(page.getByText('2件成功')).toBeVisible();
    
    // Click on history item
    await page.getByText('2件成功').click();
    
    // Verify history detail view
    await expect(page.getByText('履歴詳細')).toBeVisible();
  });

  test('should respect settings for auto-send', async ({ page }) => {
    // Login
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
    });
    await page.reload();
    
    // Open settings
    await page.getByRole('button', { name: '設定' }).click();
    
    // Disable auto-send
    const autoSendToggle = page.getByRole('switch', { name: 'OCR完了後に自動でメール送信' });
    await autoSendToggle.uncheck();
    
    // Close settings
    await page.getByRole('button', { name: '閉じる' }).click();
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(resolve(__dirname, 'fixtures/sample_card.png'));
    await page.getByRole('button', { name: 'ファイルを選択' }).click();
    
    // Verify it stops at generated state
    await expect(page.getByText('生成完了')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('送信完了')).not.toBeVisible();
  });

  test('should handle network connectivity issues', async ({ page }) => {
    // Login
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
    });
    await page.reload();
    
    // Simulate network offline
    await page.context().setOffline(true);
    
    // Try to upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(resolve(__dirname, 'fixtures/sample_card.png'));
    await page.getByRole('button', { name: 'ファイルを選択' }).click();
    
    // Verify error notification
    await expect(page.getByText('ネットワークエラー')).toBeVisible({ timeout: 10000 });
    
    // Restore connectivity
    await page.context().setOffline(false);
    
    // Retry should work
    await page.getByRole('button', { name: 'リトライ' }).click();
    await expect(page.getByText('処理中')).toBeVisible();
  });
});