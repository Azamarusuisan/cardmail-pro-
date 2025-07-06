import OpenAI from 'openai';
import { z } from 'zod';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Email generation schema
const EmailContentSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  tone: z.enum(['professional', 'friendly', 'casual']).default('professional'),
  language: z.enum(['ja', 'en']).default('ja'),
});

export type EmailContent = z.infer<typeof EmailContentSchema>;

interface BusinessCardData {
  name?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}

interface GenerateEmailOptions {
  cardData: BusinessCardData;
  senderName: string;
  senderCompany?: string;
  tone?: 'professional' | 'friendly' | 'casual';
  language?: 'ja' | 'en';
  customMessage?: string;
}

export async function generateEmail(options: GenerateEmailOptions): Promise<EmailContent> {
  const {
    cardData,
    senderName,
    senderCompany,
    tone = 'professional',
    language = 'ja',
    customMessage,
  } = options;

  try {
    const systemPrompt = createSystemPrompt(language, tone);
    const userPrompt = createUserPrompt(cardData, senderName, senderCompany, customMessage, language);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      functions: [
        {
          name: 'generate_business_email',
          description: 'Generate a professional business email',
          parameters: {
            type: 'object',
            properties: {
              subject: { type: 'string', description: 'Email subject line' },
              body: { type: 'string', description: 'Email body content' },
              tone: { type: 'string', enum: ['professional', 'friendly', 'casual'], description: 'Email tone' },
              language: { type: 'string', enum: ['ja', 'en'], description: 'Email language' },
            },
            required: ['subject', 'body'],
          },
        },
      ],
      function_call: { name: 'generate_business_email' },
      temperature: 0.7,
    });

    const functionCall = response.choices[0].message.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error('GPT failed to generate email content');
    }

    const generatedContent = JSON.parse(functionCall.arguments);
    
    // Validate the generated content
    const validatedContent = EmailContentSchema.parse({
      subject: generatedContent.subject,
      body: generatedContent.body,
      tone: generatedContent.tone || tone,
      language: generatedContent.language || language,
    });

    return validatedContent;
  } catch (error) {
    console.error('Email generation error:', error);
    
    // Fall back to template-based generation
    return generateTemplateEmail(options);
  }
}

export async function* generateEmailStream(options: GenerateEmailOptions): AsyncGenerator<Partial<EmailContent>, EmailContent, unknown> {
  const {
    cardData,
    senderName,
    senderCompany,
    tone = 'professional',
    language = 'ja',
    customMessage,
  } = options;

  try {
    const systemPrompt = createSystemPrompt(language, tone);
    const userPrompt = createUserPrompt(cardData, senderName, senderCompany, customMessage, language);

    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.7,
    });

    let subject = '';
    let body = '';
    let isBodySection = false;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      
      if (content.includes('件名:') || content.includes('Subject:')) {
        isBodySection = false;
      } else if (content.includes('本文:') || content.includes('Body:')) {
        isBodySection = true;
      } else if (content.trim()) {
        if (isBodySection) {
          body += content;
        } else {
          subject += content;
        }
      }

      // Yield partial content
      yield {
        subject: subject.trim(),
        body: body.trim(),
        tone,
        language,
      };
    }

    // Return final content
    return {
      subject: subject.trim(),
      body: body.trim(),
      tone,
      language,
    };
  } catch (error) {
    console.error('Email streaming error:', error);
    
    // Fall back to non-streaming generation
    return generateTemplateEmail(options);
  }
}

function createSystemPrompt(language: 'ja' | 'en', tone: 'professional' | 'friendly' | 'casual'): string {
  const prompts = {
    ja: {
      professional: `あなたは日本のビジネスマナーに精通したプロフェッショナルなメール作成専門家です。
名刺交換後の初回連絡メールを作成してください。以下の点を考慮してください：

- 丁寧で敬語を適切に使用
- 簡潔で要点が明確
- 今後のビジネス関係構築を意識
- 日本のビジネス文化に適した文面
- 件名は分かりやすく具体的に`,
      friendly: `フレンドリーで親しみやすい、でも礼儀正しいビジネスメールを作成してください。
堅すぎず、でも失礼にならない程度の親近感のある文面で。`,
      casual: `カジュアルで親しみやすいメールを作成してください。
敬語は最低限に留めて、自然な会話調で。`,
    },
    en: {
      professional: `You are a professional business email specialist. Create a follow-up email after exchanging business cards.
Consider these points:

- Professional and polite tone
- Clear and concise content
- Focus on building future business relationships
- Appropriate for international business culture
- Clear and specific subject line`,
      friendly: `Create a friendly yet professional business email.
Use a warm tone while maintaining business appropriateness.`,
      casual: `Create a casual and approachable email.
Use a conversational tone while remaining respectful.`,
    },
  };

  return prompts[language][tone];
}

function createUserPrompt(
  cardData: BusinessCardData,
  senderName: string,
  senderCompany?: string,
  customMessage?: string,
  language?: 'ja' | 'en'
): string {
  const isJapanese = language === 'ja';
  
  const basePrompt = isJapanese
    ? `以下の情報を元に、名刺交換後のフォローアップメールを作成してください：

送信者情報：
- 名前: ${senderName}
${senderCompany ? `- 会社: ${senderCompany}` : ''}

受信者情報（名刺から抽出）：
- 名前: ${cardData.name || '不明'}
- 会社: ${cardData.company || '不明'}
- 役職: ${cardData.role || '不明'}
- メール: ${cardData.email || '不明'}
${cardData.phone ? `- 電話: ${cardData.phone}` : ''}
${cardData.address ? `- 住所: ${cardData.address}` : ''}
${cardData.website ? `- ウェブサイト: ${cardData.website}` : ''}

${customMessage ? `特別なメッセージ: ${customMessage}` : ''}

件名と本文を含む完全なメールを作成してください。`
    : `Create a follow-up email after exchanging business cards with the following information:

Sender Information:
- Name: ${senderName}
${senderCompany ? `- Company: ${senderCompany}` : ''}

Recipient Information (extracted from business card):
- Name: ${cardData.name || 'Unknown'}
- Company: ${cardData.company || 'Unknown'}
- Role: ${cardData.role || 'Unknown'}
- Email: ${cardData.email || 'Unknown'}
${cardData.phone ? `- Phone: ${cardData.phone}` : ''}
${cardData.address ? `- Address: ${cardData.address}` : ''}
${cardData.website ? `- Website: ${cardData.website}` : ''}

${customMessage ? `Special message: ${customMessage}` : ''}

Create a complete email including subject and body.`;

  return basePrompt;
}

function generateTemplateEmail(options: GenerateEmailOptions): EmailContent {
  const { cardData, senderName, tone, language = 'ja' } = options;
  
  if (language === 'ja') {
    const templates = {
      professional: {
        subject: `${cardData.name || ''}様、お世話になっております`,
        body: `${cardData.name || ''}様

お世話になっております。
${senderName}です。

本日は貴重なお時間をいただき、ありがとうございました。
名刺交換をさせていただき、光栄でした。

今後ともどうぞよろしくお願いいたします。

${senderName}`,
      },
      friendly: {
        subject: `${cardData.name || ''}様、ありがとうございました`,
        body: `${cardData.name || ''}様

${senderName}です。

今日は名刺交換をさせていただき、ありがとうございました。
お話しできて とても嬉しかったです。

またお会いできることを楽しみにしております。

${senderName}`,
      },
      casual: {
        subject: `${cardData.name || ''}さん、お疲れ様でした`,
        body: `${cardData.name || ''}さん

${senderName}です。

今日はありがとうございました！
名刺交換できて良かったです。

また機会があればお話しましょう。

${senderName}`,
      },
    };

    return {
      ...templates[tone],
      tone,
      language,
    };
  } else {
    // English templates
    const templates = {
      professional: {
        subject: `Nice meeting you, ${cardData.name || ''}`,
        body: `Dear ${cardData.name || ''},

Thank you for taking the time to exchange business cards with me today.

It was a pleasure meeting you and learning about your work at ${cardData.company || 'your company'}.

I look forward to staying in touch and potentially collaborating in the future.

Best regards,
${senderName}`,
      },
      friendly: {
        subject: `Great meeting you today, ${cardData.name || ''}`,
        body: `Hi ${cardData.name || ''},

It was great meeting you today and exchanging business cards!

I really enjoyed our conversation about ${cardData.company || 'your work'}.

Hope to connect again soon!

Best,
${senderName}`,
      },
      casual: {
        subject: `Nice meeting you, ${cardData.name || ''}`,
        body: `Hi ${cardData.name || ''},

Thanks for the business card exchange today!

Was nice chatting with you.

Let's keep in touch!

${senderName}`,
      },
    };

    return {
      ...templates[tone],
      tone,
      language,
    };
  }
}