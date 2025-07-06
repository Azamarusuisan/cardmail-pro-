import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { generateMail } from '../helpers/generateMail.js';
import { sendGmail } from '../helpers/gmail.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Schema for send request
const sendMailSchema = z.object({
  recipient: z.object({
    name: z.string(),
    email: z.string().email(),
    company: z.string(),
    role: z.string().optional()
  }),
  templateOverrides: z.object({
    subject: z.string().optional(),
    body: z.string().optional()
  }).optional()
});

// Send email
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = sendMailSchema.parse(req.body);
    
    // Generate email content using GPT-4
    const emailContent = await generateMail(data.recipient, data.templateOverrides);
    
    // Send via Gmail API
    const result = await sendGmail({
      accessToken: req.user!.accessToken,
      from: req.user!.email,
      to: data.recipient.email,
      subject: emailContent.subject,
      body: emailContent.body
    });

    res.json({
      success: true,
      messageId: result.messageId,
      email: {
        to: data.recipient.email,
        subject: emailContent.subject
      }
    });
  } catch (error) {
    next(error);
  }
});

// Batch send
router.post('/batch', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { recipients } = req.body;
    
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new AppError(400, 'Recipients array required');
    }

    // Validate all recipients
    const validatedRecipients = recipients.map(r => 
      sendMailSchema.shape.recipient.parse(r)
    );

    // Queue all emails
    const results = [];
    for (const recipient of validatedRecipients) {
      try {
        const emailContent = await generateMail(recipient);
        const result = await sendGmail({
          accessToken: req.user!.accessToken,
          from: req.user!.email,
          to: recipient.email,
          subject: emailContent.subject,
          body: emailContent.body
        });

        results.push({
          email: recipient.email,
          status: 'sent',
          messageId: result.messageId
        });
      } catch (error) {
        results.push({
          email: recipient.email,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      total: recipients.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    });
  } catch (error) {
    next(error);
  }
});

export default router;