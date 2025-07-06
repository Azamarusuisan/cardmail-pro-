import { google } from 'googleapis';
import { AppError } from '../middleware/errorHandler.js';

// Types
interface SendMailOptions {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}

interface SendMailResult {
  messageId: string;
  threadId: string;
}

// Create Gmail API client
function getGmailClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.gmail({
    version: 'v1',
    auth: oauth2Client
  });
}

// Encode email to base64url
function encodeEmail(email: string): string {
  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Create RFC 2822 formatted email
function createMessage(options: SendMailOptions): string {
  const messageParts = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    options.body
  ];

  return messageParts.join('\n');
}

// Send email via Gmail API
export async function sendGmail(options: SendMailOptions): Promise<SendMailResult> {
  try {
    const gmail = getGmailClient(options.accessToken);
    
    const message = createMessage(options);
    const encodedMessage = encodeEmail(message);

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    if (!response.data.id || !response.data.threadId) {
      throw new AppError(500, 'Failed to send email');
    }

    return {
      messageId: response.data.id,
      threadId: response.data.threadId
    };
  } catch (error) {
    console.error('Gmail API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) {
        throw new AppError(401, 'Gmail access token expired');
      }
      if (error.message.includes('insufficient_scope')) {
        throw new AppError(403, 'Insufficient Gmail permissions');
      }
    }
    
    throw new AppError(500, 'Failed to send email via Gmail');
  }
}

// Get user's Gmail profile
export async function getGmailProfile(accessToken: string) {
  try {
    const gmail = getGmailClient(accessToken);
    const response = await gmail.users.getProfile({ userId: 'me' });
    
    return {
      emailAddress: response.data.emailAddress,
      messagesTotal: response.data.messagesTotal,
      threadsTotal: response.data.threadsTotal
    };
  } catch (error) {
    throw new AppError(500, 'Failed to get Gmail profile');
  }
}