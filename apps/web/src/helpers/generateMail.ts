import OpenAI from 'openai'
import { ParsedCardData } from './parseCard'

interface EmailContent {
  subject: string
  body: string
  tone: 'professional' | 'friendly' | 'casual'
  language: 'ja' | 'en'
}

interface GenerateMailOptions {
  tone?: 'professional' | 'friendly' | 'casual'
  language?: 'ja' | 'en'
  customMessage?: string
  senderName?: string
  senderCompany?: string
}

// メールテンプレート定義
const EMAIL_TEMPLATES = {
  professional: {
    ja: {
      subject: '{name}様、お世話になっております',
      greeting: '{name}様\n\nお世話になっております。',
      closing: '今後ともどうぞよろしくお願いいたします。'
    },
    en: {
      subject: 'Nice meeting you, {name}',
      greeting: 'Dear {name},\n\nIt was a pleasure meeting you.',
      closing: 'Looking forward to staying in touch.'
    }
  },
  friendly: {
    ja: {
      subject: '{name}さん、お会いできて嬉しかったです',
      greeting: '{name}さん\n\nお会いできて嬉しかったです！',
      closing: 'またお話しできることを楽しみにしています。'
    },
    en: {
      subject: 'Great meeting you, {name}!',
      greeting: 'Hi {name},\n\nIt was great meeting you!',
      closing: 'Hope we can chat again soon.'
    }
  },
  casual: {
    ja: {
      subject: '{name}さん、お疲れさまでした',
      greeting: '{name}さん\n\nお疲れさまでした！',
      closing: 'またお会いしましょう！'
    },
    en: {
      subject: 'Hey {name}, nice meeting you!',
      greeting: 'Hey {name},\n\nNice meeting you!',
      closing: "Let's keep in touch!"
    }
  }
}

/**
 * OpenAI GPTを使用したパーソナライズドメール生成
 */
async function generateWithGPT(
  cardData: ParsedCardData,
  options: GenerateMailOptions
): Promise<EmailContent> {
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  })

  const { tone = 'professional', language = 'ja', customMessage, senderName, senderCompany } = options
  
  const systemPrompt = language === 'ja' 
    ? `あなたはプロのビジネスメールライターです。名刺交換後のフォローアップメールを作成してください。
トーン: ${tone}
文体: 日本語のビジネスメールとして適切
長さ: 150-250文字程度
必須: 件名と本文をJSON形式で返す`
    : `You are a professional business email writer. Create a follow-up email after exchanging business cards.
Tone: ${tone}
Style: Appropriate business email format
Length: 100-200 words
Required: Return subject and body in JSON format`

  const userPrompt = `名刺情報:
名前: ${cardData.name}
会社: ${cardData.company}
役職: ${cardData.role}
メール: ${cardData.email}
${
  customMessage ? `\n追加メッセージ: ${customMessage}` : ''
}${
  senderName ? `\n送信者名: ${senderName}` : ''
}${
  senderCompany ? `\n送信者会社: ${senderCompany}` : ''
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content generated')
    }

    // JSONレスポンスをパース
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        subject: parsed.subject || parsed.件名 || '',
        body: parsed.body || parsed.本文 || content,
        tone,
        language
      }
    }

    // JSON形式でない場合のフォールバック
    const lines = content.split('\n').filter(line => line.trim())
    const subject = lines[0]?.replace(/^件名[::：]?\s*/, '') || 
                   `${cardData.name}様、お世話になっております`
    
    return {
      subject,
      body: content,
      tone,
      language
    }
  } catch (error) {
    console.error('GPT email generation failed:', error)
    throw error
  }
}

/**
 * テンプレートベースのメール生成（フォールバック）
 */
function generateWithTemplate(
  cardData: ParsedCardData,
  options: GenerateMailOptions
): EmailContent {
  const { tone = 'professional', language = 'ja', customMessage, senderName } = options
  const template = EMAIL_TEMPLATES[tone][language]
  
  const subject = template.subject.replace('{name}', cardData.name)
  
  let body = template.greeting.replace('{name}', cardData.name)
  
  if (cardData.company) {
    body += language === 'ja' 
      ? `\n${cardData.company}でのお仕事、お疲れさまです。`
      : `\nI hope things are going well at ${cardData.company}.`
  }
  
  if (customMessage) {
    body += `\n\n${customMessage}`
  }
  
  body += `\n\n${template.closing}`
  
  if (senderName) {
    body += language === 'ja' 
      ? `\n\n${senderName}`
      : `\n\nBest regards,\n${senderName}`
  }
  
  return {
    subject,
    body,
    tone,
    language
  }
}

/**
 * 編集された名刺データを使用してメールを生成
 * @param cardData 編集された名刺データ
 * @param options メール生成オプション
 * @returns 生成されたメールコンテンツ
 */
export async function generateMail(
  cardData: ParsedCardData,
  options: GenerateMailOptions = {}
): Promise<EmailContent> {
  if (!cardData.name || !cardData.email) {
    throw new Error('名前とメールアドレスは必須です')
  }

  try {
    // Primary: GPTによるパーソナライズドメール生成
    return await generateWithGPT(cardData, options)
  } catch (error) {
    console.warn('GPT email generation failed, using template:', error)
    
    // Fallback: テンプレートベース生成
    return generateWithTemplate(cardData, options)
  }
}

/**
 * メールコンテンツのストリーミング生成（リアルタイムプレビュー用）
 */
export async function* generateMailStream(
  cardData: ParsedCardData,
  options: GenerateMailOptions = {}
): AsyncGenerator<Partial<EmailContent>, EmailContent, unknown> {
  const { tone = 'professional', language = 'ja' } = options
  
  // 件名を先に生成
  const template = EMAIL_TEMPLATES[tone][language]
  const subject = template.subject.replace('{name}', cardData.name)
  
  yield { subject, tone, language }
  
  try {
    const openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    })

    const systemPrompt = language === 'ja'
      ? `フォローアップメールの本文を作成してください。トーン: ${tone}`
      : `Create a follow-up email body. Tone: ${tone}`

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `${cardData.name}さん (${cardData.company}, ${cardData.role})へのメール本文`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
      stream: true
    })

    let body = ''
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        body += content
        yield { subject, body, tone, language }
      }
    }

    return { subject, body, tone, language }
  } catch (error) {
    console.error('Streaming generation failed:', error)
    
    // フォールバックでテンプレート使用
    const fallback = generateWithTemplate(cardData, options)
    yield fallback
    return fallback
  }
}

export type { EmailContent, GenerateMailOptions }