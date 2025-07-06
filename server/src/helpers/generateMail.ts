import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Types
export interface Recipient {
  name: string;
  email: string;
  company: string;
  role?: string;
}

export interface EmailContent {
  subject: string;
  body: string;
}

export interface TemplateOverrides {
  subject?: string;
  body?: string;
}

// System prompt for GPT-4
const SYSTEM_PROMPT = `あなたは礼儀正しい日本の営業担当です。
以下の情報を基に150字前後のフォローアップメールを書いてください。
必ず敬語、結論→理由→お願いの順。最後は「ご返信お待ちしております。」で締める。`;

// Generate email using GPT-4
export async function generateMail(
  recipient: Recipient,
  overrides?: TemplateOverrides
): Promise<EmailContent> {
  // If overrides provided, use them
  if (overrides?.subject && overrides?.body) {
    return {
      subject: overrides.subject,
      body: overrides.body
    };
  }

  try {
    const userPrompt = `
名前: ${recipient.name}
会社: ${recipient.company}
${recipient.role ? `役職: ${recipient.role}` : ''}

上記の方へのフォローアップメールを作成してください。
件名も含めて提案してください。
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content generated');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);
    
    // Validate response structure
    const emailSchema = z.object({
      subject: z.string(),
      body: z.string()
    });

    const validated = emailSchema.parse(parsed);

    // Ensure body ends with expected phrase
    if (!validated.body.endsWith('ご返信お待ちしております。')) {
      validated.body += '\n\nご返信お待ちしております。';
    }

    return validated;
  } catch (error) {
    console.error('Error generating email:', error);
    
    // Fallback template
    return {
      subject: `${recipient.company} ${recipient.name}様 - ご挨拶`,
      body: `${recipient.name}様

先日はお時間をいただきありがとうございました。
${recipient.company}様の事業について大変興味深く拝聴いたしました。

ぜひ一度、詳しくお話をお聞かせいただければ幸いです。
ご都合のよろしい日時をお知らせください。

ご返信お待ちしております。`
    };
  }
}