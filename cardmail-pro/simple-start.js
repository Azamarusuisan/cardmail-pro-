#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CardMail Pro' });
});

// Mock API endpoints
app.get('/api/auth/google', (req, res) => {
  res.json({ 
    url: 'https://accounts.google.com/oauth/authorize?client_id=mock&redirect_uri=http://localhost:3000/auth/callback' 
  });
});

app.post('/api/auth/google/callback', (req, res) => {
  res.json({
    token: 'mock-jwt-token',
    user: {
      id: 'mock-user',
      email: 'demo@cardmail-pro.com',
      name: 'Demo User',
      picture: 'https://via.placeholder.com/40'
    }
  });
});

app.post('/api/upload', (req, res) => {
  res.json({
    message: 'Files uploaded successfully',
    jobs: [
      { id: 'job-1', filename: 'card1.jpg', status: 'queued' }
    ]
  });
});

app.post('/api/send', (req, res) => {
  res.json({
    success: true,
    messageId: 'mock-message-id',
    email: {
      to: req.body.recipient?.email || 'demo@example.com',
      subject: 'お打ち合わせのお礼'
    }
  });
});

// Serve demo page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CardMail Pro - Demo</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="min-h-screen flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 class="text-2xl font-bold text-gray-900 mb-4">🎉 CardMail Pro</h1>
            <p class="text-gray-600 mb-6">名刺OCR自動メール送信ツール</p>
            
            <div class="space-y-4">
                <div class="p-4 bg-green-50 border border-green-200 rounded">
                    <h3 class="font-semibold text-green-800">✅ サーバー起動完了</h3>
                    <p class="text-sm text-green-600">ポート ${PORT} で動作中</p>
                </div>
                
                <div class="p-4 bg-blue-50 border border-blue-200 rounded">
                    <h3 class="font-semibold text-blue-800">🔧 次のステップ</h3>
                    <ul class="text-sm text-blue-600 space-y-1">
                        <li>• OpenAI API キー設定</li>
                        <li>• Google OAuth2 設定</li>
                        <li>• Redis サーバー起動</li>
                    </ul>
                </div>
                
                <div class="p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <h3 class="font-semibold text-yellow-800">📝 設定ファイル</h3>
                    <code class="text-sm text-yellow-600">.env</code>
                    <p class="text-sm text-yellow-600">APIキーを設定してください</p>
                </div>
            </div>
            
            <div class="mt-6 text-center">
                <a href="/health" class="text-blue-500 hover:text-blue-600">
                    Health Check →
                </a>
            </div>
        </div>
    </div>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 CardMail Pro Demo Server`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`💡 APIキーを.envに設定後、本格的な機能が利用可能です`);
});