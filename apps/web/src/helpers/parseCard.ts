import OpenAI from 'openai'

interface ParsedCardData {
  name: string
  company: string
  role: string
  email: string
  phone: string
  confidence: number
}

interface ParseCardOptions {
  fallbackToRegex?: boolean
  language?: 'ja' | 'en' | 'auto'
}

// 正規表現パターン
const PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: {
    jp: /(?:0\d{1,4}-\d{1,4}-\d{4}|0\d{9,10}|\+81-?\d{1,4}-?\d{1,4}-?\d{4})/g,
    intl: /\+?[1-9]\d{1,14}/g
  },
  company: {
    jp: /(?:株式会社|有限会社|合同会社|一般社団法人|公益財団法人|学校法人)[^\n]+/g,
    en: /(?:Inc\.|Corp\.|LLC|Ltd\.|Co\.|Company)[^\n]*/gi
  },
  role: {
    jp: /(?:代表取締役|取締役|部長|課長|主任|マネージャー|ディレクター|エンジニア|営業)[^\n]*/g,
    en: /(?:CEO|CTO|CFO|President|Director|Manager|Engineer|Sales)[^\n]*/gi
  }
}

// OpenAI関数定義
const EXTRACTION_FUNCTION = {
  name: 'extract_business_card_info',
  description: '名刺画像から抽出されたテキストを解析し、構造化された情報を返す',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: '人名（姓名）'
      },
      company: {
        type: 'string', 
        description: '会社名・組織名'
      },
      role: {
        type: 'string',
        description: '役職・肩書き'
      },
      email: {
        type: 'string',
        description: 'メールアドレス',
        pattern: '^[^@]+@[^@]+\\.[^@]+$'
      },
      phone: {
        type: 'string',
        description: '電話番号'
      },
      confidence: {
        type: 'number',
        description: '抽出精度の信頼度 (0-1)',
        minimum: 0,
        maximum: 1
      }
    },
    required: ['name', 'company', 'role', 'email', 'phone', 'confidence']
  }
}

/**
 * 正規表現を使用した名刺データの抽出
 */
function extractWithRegex(text: string, language: string): Partial<ParsedCardData> {
  const lines = text.split('\n').filter(line => line.trim())
  const result: Partial<ParsedCardData> = {}

  // メールアドレス抽出
  const emailMatch = text.match(PATTERNS.email)
  if (emailMatch) {
    result.email = emailMatch[0]
  }

  // 電話番号抽出
  const phonePattern = language === 'ja' ? PATTERNS.phone.jp : PATTERNS.phone.intl
  const phoneMatch = text.match(phonePattern)
  if (phoneMatch) {
    result.phone = phoneMatch[0]
  }

  // 会社名抽出
  const companyPattern = language === 'ja' ? PATTERNS.company.jp : PATTERNS.company.en
  const companyMatch = text.match(companyPattern)
  if (companyMatch) {
    result.company = companyMatch[0].trim()
  }

  // 役職抽出
  const rolePattern = language === 'ja' ? PATTERNS.role.jp : PATTERNS.role.en
  const roleMatch = text.match(rolePattern)
  if (roleMatch) {
    result.role = roleMatch[0].trim()
  }

  // 人名は最初の非会社名行を推測
  if (!result.name && lines.length > 0) {
    for (const line of lines) {
      if (!line.includes('@') && 
          !phonePattern.test(line) &&
          !companyPattern.test(line) &&
          line.length > 1 && line.length < 50) {
        result.name = line.trim()
        break
      }
    }
  }

  return result
}

/**
 * OpenAI GPTを使用した高精度な名刺データ抽出
 */
async function extractWithGPT(text: string): Promise<ParsedCardData> {
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  })

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは名刺OCRテキストの解析専門家です。与えられたテキストから以下の情報を正確に抽出してください：
- 人名（姓名）
- 会社名・組織名  
- 役職・肩書き
- メールアドレス
- 電話番号

情報が不明な場合は空文字を返し、抽出精度の信頼度も0-1で評価してください。`
        },
        {
          role: 'user',
          content: `以下の名刺テキストを解析してください：\n\n${text}`
        }
      ],
      functions: [EXTRACTION_FUNCTION],
      function_call: { name: 'extract_business_card_info' },
      temperature: 0.1
    })

    const functionCall = completion.choices[0]?.message?.function_call
    if (functionCall?.arguments) {
      const parsed = JSON.parse(functionCall.arguments) as ParsedCardData
      return {
        name: parsed.name || '',
        company: parsed.company || '',
        role: parsed.role || '',
        email: parsed.email || '',
        phone: parsed.phone || '',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5))
      }
    }
  } catch (error) {
    console.error('GPT extraction failed:', error)
    throw error
  }

  throw new Error('GPT extraction returned no results')
}

/**
 * 名刺テキストから構造化データを抽出
 * @param rawText OCRで抽出された生テキスト
 * @param options 解析オプション
 * @returns 解析された名刺データ
 */
export async function parseCard(
  rawText: string,
  options: ParseCardOptions = {}
): Promise<ParsedCardData> {
  const { fallbackToRegex = true, language = 'auto' } = options
  
  if (!rawText.trim()) {
    throw new Error('Empty text provided')
  }

  // 言語自動検出
  const detectedLanguage = language === 'auto' 
    ? /[ひらがなカタカナ漢字]/.test(rawText) ? 'ja' : 'en'
    : language

  try {
    // Primary: GPT-4o による高精度抽出
    const gptResult = await extractWithGPT(rawText)
    
    // GPTの結果が信頼できない場合は正規表現で補完
    if (gptResult.confidence < 0.7 && fallbackToRegex) {
      const regexResult = extractWithRegex(rawText, detectedLanguage)
      
      return {
        name: gptResult.name || regexResult.name || '',
        company: gptResult.company || regexResult.company || '',
        role: gptResult.role || regexResult.role || '',
        email: gptResult.email || regexResult.email || '',
        phone: gptResult.phone || regexResult.phone || '',
        confidence: Math.max(gptResult.confidence, 0.6)
      }
    }
    
    return gptResult
  } catch (error) {
    console.warn('GPT extraction failed, falling back to regex:', error)
    
    if (!fallbackToRegex) {
      throw error
    }

    // Fallback: 正規表現による抽出
    const regexResult = extractWithRegex(rawText, detectedLanguage)
    
    return {
      name: regexResult.name || '',
      company: regexResult.company || '',
      role: regexResult.role || '',
      email: regexResult.email || '',
      phone: regexResult.phone || '',
      confidence: 0.4 // 正規表現は低い信頼度
    }
  }
}

export type { ParsedCardData, ParseCardOptions }