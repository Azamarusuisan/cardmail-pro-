import { createWorker, Worker } from 'tesseract.js';
import { OCRResult } from '../types';

let worker: Worker | null = null;

// Initialize Tesseract worker
async function initializeWorker() {
  if (!worker) {
    worker = await createWorker('jpn+eng', 1, {
      logger: (m) => {
        // Send progress updates to main thread
        if (m.status === 'recognizing text') {
          self.postMessage({
            type: 'progress',
            progress: Math.round(m.progress * 100),
          });
        }
      },
    });
  }
  return worker;
}

// Extract business card information from text
function extractBusinessCardInfo(text: string): OCRResult {
  const lines = text.split('\n').filter(line => line.trim());
  
  // Patterns for extraction
  const emailPattern = /[\w\.-]+@[\w\.-]+\.\w+/;
  const phonePattern = /[\d\-\(\)\+\s]{10,}/;
  const urlPattern = /https?:\/\/[\w\.-]+\.\w+/;
  const companyPatterns = [
    /株式会社[\s\S]+?(?=\s|$)/,
    /[\s\S]+?株式会社/,
    /[\s\S]+?\s*Co\.,?\s*Ltd\.?/i,
    /[\s\S]+?\s*Inc\.?/i,
    /[\s\S]+?\s*Corporation/i,
    /[\s\S]+?\s*LLC/i,
    /合同会社[\s\S]+?(?=\s|$)/,
    /有限会社[\s\S]+?(?=\s|$)/,
  ];

  let email = '';
  let company = '';
  let name = '';
  let role = '';
  const extractedData: Record<string, boolean> = {};

  // Extract email
  for (const line of lines) {
    const emailMatch = line.match(emailPattern);
    if (emailMatch && !extractedData.email) {
      email = emailMatch[0];
      extractedData.email = true;
    }
  }

  // Extract company
  for (const pattern of companyPatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match && !extractedData.company) {
        company = match[0].trim();
        extractedData.company = true;
        break;
      }
    }
    if (company) break;
  }

  // Extract name (usually the largest or most prominent text)
  // Japanese name patterns
  const japaneseNamePattern = /^[ぁ-んァ-ヶー一-龯]{2,}\s*[ぁ-んァ-ヶー一-龯]{2,}$/;
  const englishNamePattern = /^[A-Z][a-z]+\s+[A-Z][a-z]+$/;

  for (const line of lines) {
    // Skip if already identified as email, phone, URL, or company
    if (line.match(emailPattern) || 
        line.match(phonePattern) || 
        line.match(urlPattern) ||
        line === company) {
      continue;
    }

    // Check for name patterns
    if (line.match(japaneseNamePattern) || line.match(englishNamePattern)) {
      if (!extractedData.name) {
        name = line.trim();
        extractedData.name = true;
        
        // Try to find role (usually near the name)
        const lineIndex = lines.indexOf(line);
        if (lineIndex > 0) {
          const prevLine = lines[lineIndex - 1];
          if (prevLine.length < 20 && !prevLine.match(/[0-9@]/)) {
            role = prevLine.trim();
          }
        }
        if (!role && lineIndex < lines.length - 1) {
          const nextLine = lines[lineIndex + 1];
          if (nextLine.length < 20 && !nextLine.match(/[0-9@]/)) {
            role = nextLine.trim();
          }
        }
      }
    }
  }

  // Fallback: if no name found, try to find the most likely candidate
  if (!name) {
    for (const line of lines) {
      if (!line.match(emailPattern) && 
          !line.match(phonePattern) && 
          !line.match(urlPattern) &&
          line !== company &&
          line.length > 2 && 
          line.length < 30 &&
          /[ぁ-んァ-ヶー一-龯a-zA-Z]/.test(line)) {
        name = line.trim();
        break;
      }
    }
  }

  // Calculate confidence score
  let confidence = 0;
  if (email) confidence += 40;
  if (name && name !== 'Unknown') confidence += 30;
  if (company && company !== 'Unknown Company') confidence += 20;
  if (role) confidence += 10;

  return {
    name: name || '不明',
    email: email || 'no-email@example.com',
    company: company || '不明',
    role: role || undefined,
    confidence,
  };
}

// Handle messages from main thread
self.onmessage = async (event) => {
  const { id, imageData, fileName } = event.data;

  try {
    // Initialize worker if needed
    const tesseractWorker = await initializeWorker();

    // Perform OCR
    const result = await tesseractWorker.recognize(imageData);

    // Extract business card info
    const ocrResult = extractBusinessCardInfo(result.data.text);

    // Send result back
    self.postMessage({
      id,
      result: ocrResult,
      confidence: result.data.confidence,
    });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : 'OCR failed',
    });
  }
};

// Cleanup on termination
self.addEventListener('beforeunload', async () => {
  if (worker) {
    await worker.terminate();
  }
});