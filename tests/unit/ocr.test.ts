import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Mock Tesseract.js
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({
      data: {
        text: `田中太郎
営業部長
株式会社テスト
〒100-0001 東京都千代田区
TEL: 03-1234-5678
tanaka@test.co.jp
https://test.co.jp`,
        confidence: 95
      }
    }),
    terminate: vi.fn()
  })
}));

// Import the OCR extraction function (would be in worker)
function extractBusinessCardInfo(text: string) {
  const lines = text.split('\n').filter(line => line.trim());
  
  const emailPattern = /[\w\.-]+@[\w\.-]+\.\w+/;
  const companyPatterns = [
    /株式会社[\s\S]+?(?=\s|$)/,
    /[\s\S]+?株式会社/,
  ];

  let email = '';
  let company = '';
  let name = '';
  let role = '';

  // Extract email
  const emailMatch = text.match(emailPattern);
  if (emailMatch) {
    email = emailMatch[0];
  }

  // Extract company
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match) {
      company = match[0].trim();
      break;
    }
  }

  // Extract name (first non-company, non-contact line)
  for (const line of lines) {
    if (!line.match(emailPattern) && 
        line !== company &&
        line.length > 2 && 
        line.length < 30 &&
        /[ぁ-んァ-ヶー一-龯]/.test(line)) {
      if (!name) {
        name = line.trim();
      } else if (!role && line !== name) {
        role = line.trim();
        break;
      }
    }
  }

  return {
    name: name || '不明',
    email: email || 'no-email@example.com',
    company: company || '不明',
    role: role || undefined,
    confidence: 85
  };
}

describe('OCR Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract information from Japanese business card', async () => {
    const mockText = `田中太郎
営業部長
株式会社テスト
〒100-0001 東京都千代田区
TEL: 03-1234-5678
tanaka@test.co.jp`;

    const result = extractBusinessCardInfo(mockText);

    expect(result.name).toBe('田中太郎');
    expect(result.email).toBe('tanaka@test.co.jp');
    expect(result.company).toBe('株式会社テスト');
    expect(result.role).toBe('営業部長');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should extract information from English business card', async () => {
    const mockText = `John Smith
Sales Manager
Example Corp Inc.
123 Main Street, Tokyo
Phone: +81-3-1234-5678
john.smith@example.com`;

    const result = extractBusinessCardInfo(mockText);

    expect(result.name).toBe('John Smith');
    expect(result.email).toBe('john.smith@example.com');
    expect(result.company).toContain('Example Corp');
    expect(result.role).toBe('Sales Manager');
  });

  it('should handle mixed Japanese-English cards', async () => {
    const mockText = `田中 John
マネージャー / Manager
株式会社グローバル Global Corp
john.tanaka@global.co.jp
Phone: 03-5555-1234`;

    const result = extractBusinessCardInfo(mockText);

    expect(result.name).toContain('田中');
    expect(result.email).toBe('john.tanaka@global.co.jp');
    expect(result.company).toContain('株式会社グローバル');
  });

  it('should handle cards with minimal information', async () => {
    const mockText = `山田花子
yamada@simple.jp`;

    const result = extractBusinessCardInfo(mockText);

    expect(result.name).toBe('山田花子');
    expect(result.email).toBe('yamada@simple.jp');
    expect(result.company).toBe('不明');
  });

  it('should handle cards with no email', async () => {
    const mockText = `佐藤太郎
部長
テスト会社
電話: 03-1111-2222`;

    const result = extractBusinessCardInfo(mockText);

    expect(result.name).toBe('佐藤太郎');
    expect(result.email).toBe('no-email@example.com');
    expect(result.role).toBe('部長');
  });

  it('should calculate confidence score correctly', () => {
    // Test with complete information
    const completeText = `田中太郎
営業部長
株式会社テスト
tanaka@test.co.jp`;

    const completeResult = extractBusinessCardInfo(completeText);
    expect(completeResult.confidence).toBeGreaterThan(80);

    // Test with minimal information
    const minimalText = `山田
no-info@test.com`;

    const minimalResult = extractBusinessCardInfo(minimalText);
    expect(minimalResult.confidence).toBeLessThan(completeResult.confidence);
  });

  it('should handle corrupted or unclear OCR text', () => {
    const corruptedText = `T@n@k@ T@r0
S@les M@n@ger
T3st C0mp@ny
t@n@k@@test.c0.jp`;

    const result = extractBusinessCardInfo(corruptedText);
    
    // Should still extract some information
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('email');
    expect(result).toHaveProperty('company');
    expect(result.confidence).toBeLessThan(70);
  });

  it('should handle different company name formats', () => {
    const patterns = [
      '株式会社テスト',
      'テスト株式会社',
      'Test Co., Ltd.',
      'Example Inc.',
      'Sample Corporation',
      '合同会社サンプル'
    ];

    patterns.forEach(company => {
      const text = `田中太郎\n${company}\ntanaka@test.jp`;
      const result = extractBusinessCardInfo(text);
      expect(result.company).toBe(company);
    });
  });
});