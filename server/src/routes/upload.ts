import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { addToQueue } from '../helpers/queue.js';
import { AppError } from '../middleware/errorHandler.js';
import { processOCR } from '../helpers/processOCR.js';

const router = Router();

// Multer config for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 20 // Max 20 files at once
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Schema for OCR results
const ocrResultSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  company: z.string(),
  role: z.string().optional()
});

// Upload and process business cards
router.post('/', authenticateToken, upload.array('images', 20), async (req: AuthRequest, res, next) => {
  try {
    if (!req.files || !Array.isArray(req.files)) {
      throw new AppError(400, 'No files uploaded');
    }

    const jobs = [];

    // Add each image to the processing queue
    for (const file of req.files) {
      const job = await addToQueue('processCard', {
        image: file.buffer.toString('base64'),
        mimetype: file.mimetype,
        userId: req.user!.id,
        userEmail: req.user!.email,
        accessToken: req.user!.accessToken
      });

      jobs.push({
        id: job.id,
        filename: file.originalname,
        status: 'queued'
      });
    }

    res.json({
      message: 'Files uploaded and queued for processing',
      jobs
    });
  } catch (error) {
    next(error);
  }
});

// Get job status
router.get('/status/:jobId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { jobId } = req.params;
    
    // This would normally query the job status from BullMQ
    // For now, return a mock response
    res.json({
      id: jobId,
      status: 'processing',
      progress: 50
    });
  } catch (error) {
    next(error);
  }
});

export default router;