import { readFile } from 'fs/promises';
import { vision } from '@google-cloud/vision';
import OpenAI from 'openai';
import { z } from 'zod';

// Initialize Google Cloud Vision client
const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OCR result schema
const OCRResultSchema = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional(),
  confidence: z.number().min(0).max(1),
});

export type OCRResult = z.infer<typeof OCRResultSchema>;

interface OCROptions {
  language?: 'ja' | 'en';
  useGoogleVision?: boolean;
  fallbackToTesseract?: boolean;
}

export async function processOCR(
  filePath: string,
  options: OCROptions = {}
): Promise<OCRResult> {
  const {
    language = 'ja',
    useGoogleVision = true,
    fallbackToTesseract = true,
  } = options;

  try {
    let rawText = '';

    if (useGoogleVision) {
      // Use Google Cloud Vision API
      rawText = await extractTextWithGoogleVision(filePath);
    } else if (fallbackToTesseract) {
      // Use Tesseract as fallback
      rawText = await extractTextWithTesseract(filePath);
    } else {
      throw new Error('No OCR method specified');
    }

    if (!rawText.trim()) {
      throw new Error('No text extracted from image');
    }

    // Parse extracted text with GPT-4
    const parsedData = await parseCardDataWithGPT(rawText, language);

    return parsedData;
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextWithGoogleVision(filePath: string): Promise<string> {
  try {
    const [result] = await visionClient.textDetection(filePath);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      throw new Error('No text detected in image');
    }

    // Return the full text annotation
    return detections[0].description || '';
  } catch (error) {
    console.error('Google Vision API error:', error);
    throw new Error(`Google Vision API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextWithTesseract(filePath: string): Promise<string> {
  // Placeholder for Tesseract implementation
  // In a real implementation, you would use tesseract.js or node-tesseract-ocr
  console.warn('Tesseract fallback not implemented');
  return '';
}

async function parseCardDataWithGPT(rawText: string, language: 'ja' | 'en'): Promise<OCRResult> {
  try {
    const systemPrompt = language === 'ja' 
      ? `あなたは名刺の情報を抽出する専門家です。与えられたOCRテキストから以下の情報を抽出してください：
- name: 氏名
- company: 会社名
- role: 役職
- email: メールアドレス
- phone: 電話番号
- address: 住所
- website: ウェブサイト
- confidence: 抽出結果の信頼度 (0-1の間)

情報が見つからない場合は、そのフィールドを空文字列にしてください。
日本語の名刺の場合、姓名の間にスペースを入れてください。`
      : `You are an expert at extracting information from business cards. Please extract the following information from the given OCR text:
- name: Full name
- company: Company name
- role: Job title/position
- email: Email address
- phone: Phone number
- address: Address
- website: Website URL
- confidence: Confidence level of extraction (0-1)

If information is not found, leave the field as an empty string.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `OCRテキスト:\n${rawText}` },
      ],
      functions: [
        {
          name: 'extract_business_card_info',
          description: 'Extract structured information from business card text',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Full name' },
              company: { type: 'string', description: 'Company name' },
              role: { type: 'string', description: 'Job title or position' },
              email: { type: 'string', description: 'Email address' },
              phone: { type: 'string', description: 'Phone number' },
              address: { type: 'string', description: 'Address' },
              website: { type: 'string', description: 'Website URL' },
              confidence: { type: 'number', description: 'Confidence level (0-1)' },
            },
            required: ['name', 'company', 'confidence'],
          },
        },
      ],
      function_call: { name: 'extract_business_card_info' },
      temperature: 0.1,
    });

    const functionCall = response.choices[0].message.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error('GPT failed to extract business card information');
    }

    const extractedData = JSON.parse(functionCall.arguments);
    
    // Validate and sanitize the extracted data
    const validatedData = OCRResultSchema.parse({
      name: extractedData.name || '',
      company: extractedData.company || '',
      role: extractedData.role || '',
      email: extractedData.email || undefined,
      phone: extractedData.phone || '',
      address: extractedData.address || '',
      website: extractedData.website || undefined,
      confidence: extractedData.confidence || 0.5,
    });

    return validatedData;
  } catch (error) {
    console.error('GPT parsing error:', error);
    
    // Fall back to regex-based extraction
    return extractWithRegex(rawText);
  }
}

function extractWithRegex(text: string): OCRResult {
  // Simple regex-based extraction as fallback
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(?:\+81|0)\d{1,4}-?\d{1,4}-?\d{4}/;
  const urlRegex = /https?:\/\/[^\s]+/;

  const email = text.match(emailRegex)?.[0] || '';
  const phone = text.match(phoneRegex)?.[0] || '';
  const website = text.match(urlRegex)?.[0] || '';

  // Extract lines for name and company (very basic)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const name = lines[0] || '';
  const company = lines[1] || '';

  return {
    name,
    company,
    role: '',
    email: email || undefined,
    phone,
    address: '',
    website: website || undefined,
    confidence: 0.4, // Low confidence for regex extraction
  };
}