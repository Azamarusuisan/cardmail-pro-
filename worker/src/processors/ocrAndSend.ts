import { Job } from 'bullmq';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// Job data type
interface ProcessCardJobData {
  image: string; // base64
  mimetype: string;
  userId: string;
  userEmail: string;
  accessToken: string;
}

// OCR result type
interface OCRResult {
  name: string;
  email: string;
  company: string;
  role?: string;
  confidence: number;
}

// Process card handler
export async function processCardHandler(job: Job<ProcessCardJobData>) {
  const { image, mimetype, userId, userEmail, accessToken } = job.data;

  try {
    // Update job progress
    await job.updateProgress(10);

    // Decode base64 image
    const imageBuffer = Buffer.from(image, 'base64');

    // Preprocess image for better OCR
    const processedImage = await preprocessImage(imageBuffer);
    await job.updateProgress(30);

    // Perform OCR
    const ocrResult = await performOCR(processedImage);
    await job.updateProgress(60);

    // Extract business card info
    const cardInfo = extractBusinessCardInfo(ocrResult.data.text);
    await job.updateProgress(70);

    // Save card data
    const savedCard = await saveCardData({
      cardInfo,
      rawText: ocrResult.data.text,
      userId,
      fileName: `card-${Date.now()}.jpg`
    });
    await job.updateProgress(80);

    // Send email via API
    const emailResult = await sendEmailViaAPI({
      recipient: cardInfo,
      userEmail,
      accessToken
    });
    
    // Update saved card with email info
    await updateCardWithEmailInfo(savedCard.id, emailResult);
    await job.updateProgress(100);

    return {
      success: true,
      cardInfo,
      cardId: savedCard.id,
      emailId: emailResult.messageId,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing card:', error);
    throw error;
  }
}

// Preprocess image for better OCR results
async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const processed = await sharp(imageBuffer)
      .grayscale()
      .resize(2000, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .normalize()
      .sharpen()
      .toBuffer();

    return processed;
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return imageBuffer; // Return original if preprocessing fails
  }
}

// Perform OCR using Tesseract.js
async function performOCR(imageBuffer: Buffer): Promise<Tesseract.RecognizeResult> {
  const worker = await Tesseract.createWorker('jpn+eng');
  
  try {
    const result = await worker.recognize(imageBuffer);
    return result;
  } finally {
    await worker.terminate();
  }
}

// Extract business card information from OCR text
function extractBusinessCardInfo(text: string): OCRResult {
  const lines = text.split('\n').filter(line => line.trim());
  
  // Patterns for extraction
  const emailPattern = /[\w\.-]+@[\w\.-]+\.\w+/;
  const phonePattern = /[\d\-\(\)\+\s]{10,}/;
  const companyPatterns = [
    /株式会社[\s\w]+/,
    /[\w]+株式会社/,
    /[\w]+\s*Co\.,?\s*Ltd\.?/i,
    /[\w]+\s*Inc\.?/i,
    /[\w]+\s*Corporation/i
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

  // Extract name (usually one of the first non-company lines)
  for (const line of lines) {
    if (!line.match(emailPattern) && 
        !line.match(phonePattern) && 
        !companyPatterns.some(p => line.match(p)) &&
        line.length > 2 && line.length < 30) {
      // Check if it looks like a Japanese name
      if (/[^\x00-\x7F]/.test(line) || /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(line)) {
        name = line.trim();
        break;
      }
    }
  }

  // Extract role (usually near name)
  const nameIndex = lines.findIndex(l => l.includes(name));
  if (nameIndex !== -1 && nameIndex < lines.length - 1) {
    const potentialRole = lines[nameIndex + 1];
    if (potentialRole.length < 20 && !potentialRole.match(emailPattern)) {
      role = potentialRole.trim();
    }
  }

  // Confidence score based on extracted fields
  let confidence = 0;
  if (email) confidence += 40;
  if (name) confidence += 30;
  if (company) confidence += 20;
  if (role) confidence += 10;

  return {
    name: name || 'Unknown',
    email: email || 'no-email@example.com',
    company: company || 'Unknown Company',
    role,
    confidence
  };
}

// Send email via server API
async function sendEmailViaAPI(params: {
  recipient: OCRResult;
  userEmail: string;
  accessToken: string;
}) {
  const { recipient, accessToken } = params;

  // In production, this would call the actual server API
  // For now, return mock response
  const response = await fetch(`${process.env.API_URL || 'http://localhost:4000'}/api/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ recipient })
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.statusText}`);
  }

  return response.json();
}

// Save card data to storage
async function saveCardData(params: {
  cardInfo: OCRResult;
  rawText: string;
  userId: string;
  fileName: string;
}) {
  const { cardInfo, rawText, userId, fileName } = params;
  
  const cardData = {
    id: uuidv4(),
    fileName,
    rawText,
    extractedData: {
      name: cardInfo.name,
      company: cardInfo.company,
      role: cardInfo.role || '',
      email: cardInfo.email,
      phone: '', // Extract from rawText if needed
      confidence: cardInfo.confidence / 100
    },
    status: 'ready',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Save to server via API
  const response = await fetch(`${process.env.API_URL || 'http://localhost:4000'}/api/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cardData)
  });

  if (!response.ok) {
    throw new Error(`Failed to save card: ${response.statusText}`);
  }

  return cardData;
}

// Update card with email information
async function updateCardWithEmailInfo(cardId: string, emailResult: any) {
  const updateData = {
    status: 'sent',
    sentAt: new Date().toISOString(),
    emailContent: {
      subject: emailResult.subject || '名刺交換のお礼',
      body: emailResult.body || 'お世話になっております。',
      tone: 'professional',
      language: 'ja'
    }
  };

  const response = await fetch(`${process.env.API_URL || 'http://localhost:4000'}/api/cards/${cardId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    console.error(`Failed to update card ${cardId}: ${response.statusText}`);
  }

  return response.ok;
}