import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMail } from '@server/helpers/generate-mail';
import type { Recipient } from '@server/helpers/generate-mail';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  subject: '田中様 - お打ち合わせのお礼',
                  body: '田中様\n\n先日はお忙しい中、貴重なお時間をいただきありがとうございました。\n株式会社テストの事業展開について詳しくお聞かせいただき、大変勉強になりました。\n\nぜひ今後ともよろしくお願いいたします。\n\nご返信お待ちしております。'
                })
              }
            }]
          })
        }
      }
    }))
  };
});

describe('generateMail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate email for Japanese recipient', async () => {
    const recipient: Recipient = {
      name: '田中太郎',
      email: 'tanaka@test.co.jp',
      company: '株式会社テスト',
      role: '営業部長'
    };

    const result = await generateMail(recipient);

    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('body');
    expect(result.subject).toContain('田中');
    expect(result.body).toContain('田中様');
    expect(result.body).toContain('株式会社テスト');
    expect(result.body).toContain('ご返信お待ちしております。');
  });

  it('should generate email for English recipient', async () => {
    const recipient: Recipient = {
      name: 'John Smith',
      email: 'john@example.com',
      company: 'Example Corp',
      role: 'Sales Manager'
    };

    const result = await generateMail(recipient);

    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('body');
    expect(result.subject).toContain('お打ち合わせのお礼');
    expect(result.body).toContain('John Smith');
    expect(result.body).toContain('Example Corp');
  });

  it('should handle template overrides', async () => {
    const recipient: Recipient = {
      name: '山田花子',
      email: 'yamada@sample.jp',
      company: 'サンプル株式会社'
    };

    const overrides = {
      subject: 'カスタム件名',
      body: 'カスタムメール本文です。'
    };

    const result = await generateMail(recipient, overrides);

    expect(result.subject).toBe('カスタム件名');
    expect(result.body).toBe('カスタムメール本文です。');
  });

  it('should use fallback template on API error', async () => {
    // Mock OpenAI to throw error
    const { default: OpenAI } = await import('openai');
    const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));
    (OpenAI as any).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }));

    const recipient: Recipient = {
      name: '佐藤次郎',
      email: 'sato@fallback.jp',
      company: 'フォールバック株式会社'
    };

    const result = await generateMail(recipient);

    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('body');
    expect(result.subject).toContain('佐藤次郎');
    expect(result.body).toContain('佐藤次郎様');
  });

  it('should ensure body ends with expected phrase', async () => {
    const recipient: Recipient = {
      name: '鈴木三郎',
      email: 'suzuki@test.jp',
      company: 'テスト会社'
    };

    const result = await generateMail(recipient);

    expect(result.body).toMatch(/ご返信お待ちしております。$/);
  });

  it('should validate email content structure', async () => {
    const recipient: Recipient = {
      name: '高橋四郎',
      email: 'takahashi@validation.jp',
      company: 'バリデーション株式会社'
    };

    const result = await generateMail(recipient);

    // Check that subject is not empty
    expect(result.subject.trim()).toBeTruthy();
    expect(result.subject.length).toBeGreaterThan(5);

    // Check that body contains essential elements
    expect(result.body).toContain('様');
    expect(result.body.length).toBeGreaterThan(50);
    expect(result.body.length).toBeLessThan(500);
  });
});