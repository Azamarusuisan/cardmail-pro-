import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Review & Send フロー', () => {
  test.beforeEach(async ({ page }) => {
    // ログインしてダッシュボードに移動
    await page.goto('/login')
    await page.waitForSelector('[data-testid="google-login-button"]')
    
    // モックログインを実行（テスト環境用）
    await page.evaluate(() => {
      window.localStorage.setItem('auth-token', 'mock-token')
      window.localStorage.setItem('user', JSON.stringify({
        id: 'test-user',
        name: 'テスト ユーザー',
        email: 'test@example.com',
        picture: 'https://example.com/avatar.jpg'
      }))
    })
    
    await page.goto('/')
    await page.waitForSelector('[data-testid="dashboard"]')
  })

  test('名刺アップロードからレビュー画面への遷移', async ({ page }) => {
    // サンプル名刺画像をアップロード
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/sample-card.jpg'))
    
    // アップロード完了を待つ
    await expect(page.locator('[data-testid="processing-card"]')).toBeVisible({ timeout: 10000 })
    
    // 自動的にレビュー画面にリダイレクトされることを確認
    await expect(page).toHaveURL('/review')
    await expect(page.locator('h1')).toContainText('名刺レビュー & 送信')
  })

  test('名刺情報の編集とバリデーション', async ({ page }) => {
    // レビュー画面に直接アクセス（モックデータ付き）
    await page.goto('/review')
    
    // モックデータを設定
    await page.evaluate(() => {
      window.localStorage.setItem('cardmail-cards', JSON.stringify({
        state: {
          pendingCards: [{
            id: 'test-card-1',
            fileName: 'sample-card.jpg',
            thumbnailUrl: '/test-thumbnail.jpg',
            rawText: 'サンプルテキスト',
            extractedData: {
              name: '山田 太郎',
              company: '株式会社サンプル',
              role: '営業部長',
              email: 'yamada@example.com',
              phone: '03-1234-5678',
              confidence: 0.9
            },
            status: 'reviewing',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }],
          selectedCardId: 'test-card-1'
        }
      }))
    })
    
    await page.reload()
    await page.waitForSelector('[data-testid="edit-form"]')
    
    // 名前フィールドを編集
    const nameInput = page.locator('input[placeholder*="名前"]')
    await nameInput.clear()
    await nameInput.fill('佐藤 花子')
    
    // メールアドレスを無効な値に変更
    const emailInput = page.locator('input[type="email"]')
    await emailInput.clear()
    await emailInput.fill('無効なメール')
    
    // バリデーションエラーが表示されることを確認
    await expect(page.locator('.text-destructive')).toContainText('有効なメールアドレス')
    
    // 有効なメールアドレスに修正
    await emailInput.clear()
    await emailInput.fill('sato@example.com')
    
    // エラーが消えることを確認
    await expect(page.locator('.text-destructive')).toHaveCount(0)
    
    // 自動保存インジケーターが表示されることを確認
    await expect(page.locator('.animate-pulse')).toBeVisible()
  })

  test('メール生成とプレビュー', async ({ page }) => {
    // レビュー画面にモックデータでアクセス
    await page.goto('/review')
    await page.evaluate(() => {
      window.localStorage.setItem('cardmail-cards', JSON.stringify({
        state: {
          pendingCards: [{
            id: 'test-card-1',
            fileName: 'sample-card.jpg',
            extractedData: {
              name: '山田 太郎',
              company: '株式会社サンプル',
              role: '営業部長',
              email: 'yamada@example.com',
              phone: '03-1234-5678',
              confidence: 0.9
            },
            status: 'reviewing',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }],
          selectedCardId: 'test-card-1'
        }
      }))
    })
    
    await page.reload()
    
    // メール生成ボタンをクリック
    await page.click('button:has-text("メールを生成")')
    
    // 生成中のローディング表示を確認
    await expect(page.locator('text=メール生成中')).toBeVisible()
    
    // ストリーミングプレビューが表示されることを確認
    await expect(page.locator('[data-testid="streaming-preview"]')).toBeVisible({ timeout: 5000 })
    
    // 生成完了後にメールコンテンツが表示されることを確認
    await expect(page.locator('[data-testid="email-content"]')).toBeVisible({ timeout: 10000 })
    
    // 件名と本文が表示されることを確認
    await expect(page.locator('text=件名')).toBeVisible()
    await expect(page.locator('text=本文')).toBeVisible()
    
    // 送信ボタンが有効になることを確認
    await expect(page.locator('button:has-text("送信")')).toBeEnabled()
  })

  test('メール送信フロー', async ({ page }) => {
    // APIモックを設定
    await page.route('**/api/send', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, messageId: 'test-message-id' })
      })
    })
    
    // メールコンテンツ付きのモックデータでレビュー画面にアクセス
    await page.goto('/review')
    await page.evaluate(() => {
      window.localStorage.setItem('cardmail-cards', JSON.stringify({
        state: {
          pendingCards: [{
            id: 'test-card-1',
            fileName: 'sample-card.jpg',
            extractedData: {
              name: '山田 太郎',
              email: 'yamada@example.com',
              company: '株式会社サンプル',
              role: '営業部長',
              phone: '03-1234-5678',
              confidence: 0.9
            },
            emailContent: {
              subject: '山田様、お世話になっております',
              body: '山田様\n\nお世話になっております。\n今後ともどうぞよろしくお願いいたします。',
              tone: 'professional',
              language: 'ja'
            },
            status: 'ready',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }],
          selectedCardId: 'test-card-1'
        }
      }))
    })
    
    await page.reload()
    
    // 送信ボタンをクリック
    await page.click('button:has-text("送信")')
    
    // 送信中の状態を確認
    await expect(page.locator('text=送信中')).toBeVisible()
    
    // 成功時のLottieアニメーションが再生されることを確認
    await expect(page.locator('[data-testid="success-animation"]')).toBeVisible({ timeout: 5000 })
    
    // 送信完了メッセージを確認
    await expect(page.locator('text=送信完了')).toBeVisible()
    
    // カードが送信済みリストに移動したことを確認
    await page.click('button:has-text("送信済み")')
    await expect(page.locator('[data-testid="sent-card"]')).toBeVisible()
  })

  test('キーボードショートカットの動作', async ({ page }) => {
    // メールコンテンツ付きのモックデータでセットアップ
    await page.goto('/review')
    await page.evaluate(() => {
      window.localStorage.setItem('cardmail-cards', JSON.stringify({
        state: {
          pendingCards: [{
            id: 'test-card-1',
            fileName: 'sample-card.jpg',
            extractedData: {
              name: '山田 太郎',
              email: 'yamada@example.com'
            },
            emailContent: {
              subject: 'テスト件名',
              body: 'テスト本文'
            },
            status: 'ready',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }],
          selectedCardId: 'test-card-1'
        }
      }))
    })
    
    await page.reload()
    
    // Cmd/Ctrl + Enterで送信できることを確認
    await page.keyboard.press('Meta+Enter') // MacのCmdキー
    
    // 送信中の状態が表示されることを確認
    await expect(page.locator('text=送信中')).toBeVisible()
  })

  test('エラーハンドリング', async ({ page }) => {
    // APIエラーをモック
    await page.route('**/api/send', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'サーバーエラーが発生しました' })
      })
    })
    
    // モックデータでセットアップ
    await page.goto('/review')
    await page.evaluate(() => {
      window.localStorage.setItem('cardmail-cards', JSON.stringify({
        state: {
          pendingCards: [{
            id: 'test-card-1',
            extractedData: { name: 'テスト', email: 'test@example.com' },
            emailContent: { subject: 'テスト', body: 'テスト' },
            status: 'ready',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }],
          selectedCardId: 'test-card-1'
        }
      }))
    })
    
    await page.reload()
    
    // 送信を試みる
    await page.click('button:has-text("送信")')
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('.text-destructive')).toContainText('エラー')
    
    // 再試行ボタンが表示されることを確認
    await expect(page.locator('button:has-text("再試行")')).toBeVisible()
    
    // カードが失敗状態にマークされることを確認
    await expect(page.locator('[data-testid="failed-badge"]')).toBeVisible()
  })

  test('サイドバーからのカード選択', async ({ page }) => {
    // 複数のカードを持つモックデータ
    await page.goto('/review')
    await page.evaluate(() => {
      window.localStorage.setItem('cardmail-cards', JSON.stringify({
        state: {
          pendingCards: [
            {
              id: 'card-1',
              fileName: 'card1.jpg',
              extractedData: { name: '山田 太郎', email: 'yamada@example.com' },
              status: 'reviewing',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'card-2', 
              fileName: 'card2.jpg',
              extractedData: { name: '佐藤 花子', email: 'sato@example.com' },
              status: 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          selectedCardId: 'card-1'
        }
      }))
    })
    
    await page.reload()
    
    // 最初のカードが選択されていることを確認
    await expect(page.locator('[data-selected="true"]')).toContainText('山田 太郎')
    
    // 2番目のカードをクリック
    await page.click('text=佐藤 花子')
    
    // カードが切り替わることを確認
    await expect(page.locator('input[value="佐藤 花子"]')).toBeVisible()
    
    // スキップボタンでカードを最後に移動
    await page.hover('[data-testid="card-item-card-2"]')
    await page.click('[title="あとで処理"]')
    
    // カードの順序が変わることを確認
    const cardOrder = await page.locator('[data-testid^="card-item"]').allTextContents()
    expect(cardOrder[0]).toContain('山田 太郎')
    expect(cardOrder[1]).toContain('佐藤 花子')
  })
})