import { Router } from 'express';
import { promises as fs } from 'fs';
import { join } from 'path';
import { z } from 'zod';

const router = Router();
const CARDS_DIR = join(process.cwd(), 'data', 'cards');

// データディレクトリが存在しない場合は作成
const ensureDataDir = async () => {
  try {
    await fs.access(CARDS_DIR);
  } catch {
    await fs.mkdir(CARDS_DIR, { recursive: true });
  }
};

// 名刺データのスキーマ
const SavedCardSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  thumbnailUrl: z.string().optional(),
  rawText: z.string(),
  extractedData: z.object({
    name: z.string(),
    company: z.string(),
    role: z.string(),
    email: z.string(),
    phone: z.string(),
    confidence: z.number()
  }),
  emailContent: z.object({
    subject: z.string(),
    body: z.string(),
    tone: z.enum(['professional', 'friendly', 'casual']),
    language: z.enum(['ja', 'en'])
  }).optional(),
  status: z.enum(['pending', 'reviewing', 'generating', 'ready', 'sending', 'sent', 'failed']),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sentAt: z.string().optional()
});

type SavedCard = z.infer<typeof SavedCardSchema>;

// 名刺を保存
router.post('/', async (req, res) => {
  try {
    await ensureDataDir();
    
    const cardData = SavedCardSchema.parse(req.body);
    const filePath = join(CARDS_DIR, `${cardData.id}.json`);
    
    await fs.writeFile(filePath, JSON.stringify(cardData, null, 2));
    
    res.json({ success: true, id: cardData.id });
  } catch (error) {
    console.error('Error saving card:', error);
    res.status(400).json({ error: error instanceof z.ZodError ? error.issues : 'Failed to save card' });
  }
});

// 保存された名刺一覧を取得
router.get('/', async (req, res) => {
  try {
    await ensureDataDir();
    
    const files = await fs.readdir(CARDS_DIR);
    const cardFiles = files.filter(file => file.endsWith('.json'));
    
    const cards: SavedCard[] = [];
    
    for (const file of cardFiles) {
      try {
        const filePath = join(CARDS_DIR, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const cardData = JSON.parse(fileContent);
        cards.push(cardData);
      } catch (error) {
        console.error(`Error reading card file ${file}:`, error);
      }
    }
    
    // 作成日時で降順ソート
    cards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// 特定の名刺を取得
router.get('/:id', async (req, res) => {
  try {
    await ensureDataDir();
    
    const { id } = req.params;
    const filePath = join(CARDS_DIR, `${id}.json`);
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const cardData = JSON.parse(fileContent);
    
    res.json(cardData);
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(404).json({ error: 'Card not found' });
  }
});

// 名刺を更新
router.put('/:id', async (req, res) => {
  try {
    await ensureDataDir();
    
    const { id } = req.params;
    const filePath = join(CARDS_DIR, `${id}.json`);
    
    // 既存のデータを読み込み
    const existingContent = await fs.readFile(filePath, 'utf-8');
    const existingData = JSON.parse(existingContent);
    
    // 新しいデータとマージ
    const updatedData = {
      ...existingData,
      ...req.body,
      id, // IDは変更不可
      updatedAt: new Date().toISOString()
    };
    
    const validatedData = SavedCardSchema.parse(updatedData);
    
    await fs.writeFile(filePath, JSON.stringify(validatedData, null, 2));
    
    res.json(validatedData);
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(400).json({ error: error instanceof z.ZodError ? error.issues : 'Failed to update card' });
  }
});

// 名刺を削除
router.delete('/:id', async (req, res) => {
  try {
    await ensureDataDir();
    
    const { id } = req.params;
    const filePath = join(CARDS_DIR, `${id}.json`);
    
    await fs.unlink(filePath);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(404).json({ error: 'Card not found' });
  }
});

// 送信済み名刺の履歴を取得
router.get('/history/sent', async (req, res) => {
  try {
    await ensureDataDir();
    
    const files = await fs.readdir(CARDS_DIR);
    const cardFiles = files.filter(file => file.endsWith('.json'));
    
    const sentCards: SavedCard[] = [];
    
    for (const file of cardFiles) {
      try {
        const filePath = join(CARDS_DIR, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const cardData = JSON.parse(fileContent);
        
        if (cardData.status === 'sent' && cardData.sentAt) {
          sentCards.push(cardData);
        }
      } catch (error) {
        console.error(`Error reading card file ${file}:`, error);
      }
    }
    
    // 送信日時で降順ソート
    sentCards.sort((a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime());
    
    res.json(sentCards);
  } catch (error) {
    console.error('Error fetching sent cards:', error);
    res.status(500).json({ error: 'Failed to fetch sent cards' });
  }
});

export default router;