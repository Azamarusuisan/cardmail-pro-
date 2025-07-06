// Google Cloud Vision API wrapper for client-side usage
// Note: This requires proper CORS setup and API key restrictions

interface VisionAPIResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      boundingPoly?: any;
    }>;
    error?: {
      code: number;
      message: string;
    };
  }>;
}

export interface OCRResult {
  text: string;
  confidence: number;
}

/**
 * Extract text from image using Google Cloud Vision API
 * @param imageFile - Image file to process
 * @returns Promise with extracted text and confidence
 */
export async function extractTextFromImage(imageFile: File): Promise<OCRResult> {
  const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Cloud API key not configured');
  }

  try {
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile);
    
    // Prepare Vision API request
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image.split(',')[1] // Remove data:image/... prefix
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1
            }
          ],
          imageContext: {
            languageHints: ['ja', 'en'] // Support both Japanese and English
          }
        }
      ]
    };

    // Call Google Cloud Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      throw new Error(`Vision API request failed: ${response.status} ${response.statusText}`);
    }

    const data: VisionAPIResponse = await response.json();
    
    // Check for API errors
    if (data.responses[0]?.error) {
      throw new Error(`Vision API error: ${data.responses[0].error.message}`);
    }

    // Extract text from response
    const textAnnotations = data.responses[0]?.textAnnotations;
    
    if (!textAnnotations || textAnnotations.length === 0) {
      return {
        text: '',
        confidence: 0
      };
    }

    // The first annotation contains the full text
    const fullText = textAnnotations[0].description || '';
    
    // Calculate confidence based on text length and structure
    const confidence = calculateConfidence(fullText, textAnnotations);

    return {
      text: fullText,
      confidence
    };

  } catch (error) {
    console.error('Google Vision API error:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate confidence score based on text quality
 */
function calculateConfidence(text: string, annotations: any[]): number {
  if (!text.trim()) {
    return 0;
  }

  let confidence = 0.5; // Base confidence

  // Boost confidence if email found
  if (text.includes('@')) {
    confidence += 0.2;
  }

  // Boost confidence if phone number pattern found
  if (/\d{2,4}-\d{2,4}-\d{4}/.test(text)) {
    confidence += 0.2;
  }

  // Boost confidence if Japanese business terms found
  if (/株式会社|有限会社|代表|取締役|部長|課長/.test(text)) {
    confidence += 0.2;
  }

  // Boost confidence if English business terms found
  if (/Inc\.|Corp\.|LLC|CEO|President|Manager/.test(text)) {
    confidence += 0.2;
  }

  // Boost confidence based on text length (more text usually means better OCR)
  if (text.length > 50) {
    confidence += 0.1;
  }

  // Cap at 0.95 (never 100% confident)
  return Math.min(confidence, 0.95);
}

/**
 * Fallback OCR using browser's experimental Web APIs
 * This is a placeholder for potential future browser OCR capabilities
 */
export async function fallbackOCR(imageFile: File): Promise<OCRResult> {
  // For now, return empty result
  // In the future, this could use Tesseract.js or other client-side OCR
  console.warn('Fallback OCR not implemented');
  return {
    text: '',
    confidence: 0
  };
}