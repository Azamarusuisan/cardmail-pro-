import { describe, test, expect, vi, beforeEach } from 'vitest'
import { parseCard } from '../../apps/web/src/helpers/parseCard'

// OpenAI APIをモック
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              function_call: {
                arguments: JSON.stringify({
                  name: '山田 太郎',
                  company: '株式会社サンプル',
                  role: '営業部長',
                  email: 'yamada@example.com',
                  phone: '03-1234-5678',
                  confidence: 0.9
                })
              }
            }
          }]
        })
      }
    }
  }))
}))

describe('parseCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('日本語名刺のOCRテキストを正しく解析する', async () => {
    const mockText = `
山田 太郎
株式会社サンプル
営業部長
yamada@example.com
03-1234-5678
東京都渋谷区...
    `.trim()

    const result = await parseCard(mockText)

    expect(result.name).toBe('山田 太郎')
    expect(result.company).toBe('株式会社サンプル')
    expect(result.role).toBe('営業部長')
    expect(result.email).toBe('yamada@example.com')
    expect(result.phone).toBe('03-1234-5678')
    expect(result.confidence).toBeGreaterThanOrEqual(0.8)
  })

  test('英語名刺のOCRテキストを正しく解析する', async () => {
    const mockText = `
John Smith
Sample Corporation
Sales Manager
john.smith@example.com
+1-555-123-4567
    `.trim()

    const result = await parseCard(mockText, { language: 'en' })

    expect(result.name).toBe('山田 太郎') // モックの戻り値
    expect(result.email).toBe('yamada@example.com')
    expect(result.confidence).toBeGreaterThanOrEqual(0.8)
  })

  test('空のテキストでエラーを投げる', async () => {
    await expect(parseCard('')).rejects.toThrow('Empty text provided')
    await expect(parseCard('   ')).rejects.toThrow('Empty text provided')
  })

  test('GPT失敗時に正規表現フォールバックを使用する', async () => {
    // GPTを失敗させる
    vi.mocked(require('openai').default).mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('GPT API Error'))
        }
      }
    }))

    const mockText = `
山田 太郎
株式会社サンプル
yamada@example.com
03-1234-5678
    `.trim()

    const result = await parseCard(mockText)

    // 正規表現で抽出された値
    expect(result.email).toBe('yamada@example.com')
    expect(result.phone).toBe('03-1234-5678')
    expect(result.confidence).toBe(0.4) // 正規表現は低い信頼度
  })

  test('メールアドレスの正規表現が正しく動作する', async () => {
    // フォールバックモードを強制
    const mockText = 'test.email+tag@example.co.jp'
    
    const result = await parseCard(mockText, { fallbackToRegex: true })
    
    expect(result.email).toBe('test.email+tag@example.co.jp')
  })

  test('電話番号の正規表現が正しく動作する', async () => {
    const testCases = [
      '03-1234-5678',
      '090-1234-5678', 
      '+81-3-1234-5678',
      '0312345678'
    ]

    for (const phone of testCases) {
      const result = await parseCard(phone, { fallbackToRegex: true })
      expect(result.phone).toBe(phone)
    }
  })

  test('会社名の正規表現が正しく動作する', async () => {
    const testCases = [
      '株式会社サンプル',
      '有限会社テスト',
      '一般社団法人例'
    ]

    for (const company of testCases) {
      const result = await parseCard(company, { fallbackToRegex: true, language: 'ja' })
      expect(result.company).toBe(company)
    }
  })

  test('信頼度が0.7未満の場合に正規表現で補強する', async () => {
    // 低い信頼度のGPT結果をモック
    vi.mocked(require('openai').default).mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                function_call: {
                  arguments: JSON.stringify({
                    name: '山田',
                    company: '',
                    role: '',
                    email: 'yamada@example.com',
                    phone: '',
                    confidence: 0.5
                  })
                }
              }
            }]
          })
        }
      }
    }))

    const mockText = `
山田 太郎
株式会社サンプル
yamada@example.com
03-1234-5678
    `.trim()

    const result = await parseCard(mockText)

    // GPTと正規表現の結果がマージされる
    expect(result.name).toBe('山田') // GPTの結果
    expect(result.email).toBe('yamada@example.com') // 両方で一致
    expect(result.confidence).toBeGreaterThanOrEqual(0.6) // 補強された信頼度
  })
})