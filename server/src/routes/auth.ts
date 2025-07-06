import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Schema validation
const callbackSchema = z.object({
  code: z.string()
});

// Generate OAuth URL
router.get('/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.send'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes
  });

  res.json({ url });
});

// OAuth callback
router.post('/google/callback', async (req, res, next) => {
  try {
    const { code } = callbackSchema.parse(req.body);
    
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });

    if (!response.ok) {
      throw new AppError(401, 'Failed to get user info');
    }

    const userInfo = await response.json();

    // Create JWT
    const jwtPayload = {
      id: userInfo.id,
      email: userInfo.email,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!
    };

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET!, {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      }
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new AppError(400, 'Refresh token required');
    }

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    res.json({
      accessToken: credentials.access_token
    });
  } catch (error) {
    next(error);
  }
});

export default router;