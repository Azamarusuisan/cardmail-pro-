import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { Edit, Delete, Visibility, Email } from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface SavedCard {
  id: string;
  fileName: string;
  thumbnailUrl?: string;
  rawText: string;
  extractedData: {
    name: string;
    company: string;
    role: string;
    email: string;
    phone: string;
    confidence: number;
  };
  emailContent?: {
    subject: string;
    body: string;
    tone: 'professional' | 'friendly' | 'casual';
    language: 'ja' | 'en';
  };
  status: 'pending' | 'reviewing' | 'generating' | 'ready' | 'sending' | 'sent' | 'failed';
  error?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
}

const SavedCards: React.FC = () => {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<SavedCard | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<SavedCard | null>(null);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await fetch('/api/cards');
      if (response.ok) {
        const cardsData = await response.json();
        setCards(cardsData);
      } else {
        console.error('Failed to fetch cards');
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (card: SavedCard) => {
    setSelectedCard(card);
    setDetailDialogOpen(true);
  };

  const handleEdit = (card: SavedCard) => {
    setEditingCard({ ...card });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCard) return;

    try {
      const response = await fetch(`/api/cards/${editingCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingCard),
      });

      if (response.ok) {
        const updatedCard = await response.json();
        setCards(cards.map(card => card.id === updatedCard.id ? updatedCard : card));
        setEditDialogOpen(false);
        setEditingCard(null);
      } else {
        console.error('Failed to update card');
      }
    } catch (error) {
      console.error('Error updating card:', error);
    }
  };

  const handleDelete = async (cardId: string) => {
    if (!confirm('この名刺を削除しますか？')) return;

    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCards(cards.filter(card => card.id !== cardId));
      } else {
        console.error('Failed to delete card');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'success';
      case 'failed': return 'error';
      case 'ready': return 'primary';
      case 'processing': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '保留中';
      case 'reviewing': return '確認中';
      case 'generating': return '生成中';
      case 'ready': return '送信準備完了';
      case 'sending': return '送信中';
      case 'sent': return '送信済み';
      case 'failed': return '失敗';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        保存された名刺
      </Typography>
      
      {cards.length === 0 ? (
        <Typography color="textSecondary">
          保存された名刺がありません。
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {cards.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="h3" noWrap>
                      {card.extractedData.name || '名前未取得'}
                    </Typography>
                    <Chip 
                      label={getStatusText(card.status)}
                      color={getStatusColor(card.status) as any}
                      size="small"
                    />
                  </Box>
                  
                  <Typography color="textSecondary" gutterBottom>
                    {card.extractedData.company || '会社名未取得'}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {card.extractedData.role || '役職未取得'}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {card.extractedData.email || 'メールアドレス未取得'}
                  </Typography>
                  
                  <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                    作成日: {format(new Date(card.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                  </Typography>
                  
                  {card.sentAt && (
                    <Typography variant="caption" display="block">
                      送信日: {format(new Date(card.sentAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </Typography>
                  )}
                  
                  <Box display="flex" justifyContent="space-between" mt={2}>
                    <IconButton size="small" onClick={() => handleViewDetails(card)}>
                      <Visibility fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleEdit(card)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    {card.emailContent && (
                      <IconButton size="small">
                        <Email fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton size="small" onClick={() => handleDelete(card.id)} color="error">
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>名刺詳細</DialogTitle>
        <DialogContent>
          {selectedCard && (
            <Box>
              <Typography variant="h6" gutterBottom>基本情報</Typography>
              <Typography><strong>名前:</strong> {selectedCard.extractedData.name}</Typography>
              <Typography><strong>会社:</strong> {selectedCard.extractedData.company}</Typography>
              <Typography><strong>役職:</strong> {selectedCard.extractedData.role}</Typography>
              <Typography><strong>メール:</strong> {selectedCard.extractedData.email}</Typography>
              <Typography><strong>電話:</strong> {selectedCard.extractedData.phone}</Typography>
              <Typography><strong>信頼度:</strong> {(selectedCard.extractedData.confidence * 100).toFixed(1)}%</Typography>
              
              <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>OCRテキスト</Typography>
              <Typography 
                component="pre" 
                sx={{ 
                  whiteSpace: 'pre-wrap', 
                  bgcolor: 'grey.100', 
                  p: 2, 
                  borderRadius: 1,
                  fontSize: '0.875rem'
                }}
              >
                {selectedCard.rawText}
              </Typography>
              
              {selectedCard.emailContent && (
                <>
                  <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>生成されたメール</Typography>
                  <Typography><strong>件名:</strong> {selectedCard.emailContent.subject}</Typography>
                  <Typography 
                    component="pre" 
                    sx={{ 
                      whiteSpace: 'pre-wrap', 
                      bgcolor: 'grey.100', 
                      p: 2, 
                      borderRadius: 1,
                      mt: 1,
                      fontSize: '0.875rem'
                    }}
                  >
                    {selectedCard.emailContent.body}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>名刺編集</DialogTitle>
        <DialogContent>
          {editingCard && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="名前"
                value={editingCard.extractedData.name}
                onChange={(e) => setEditingCard({
                  ...editingCard,
                  extractedData: { ...editingCard.extractedData, name: e.target.value }
                })}
                fullWidth
              />
              <TextField
                label="会社"
                value={editingCard.extractedData.company}
                onChange={(e) => setEditingCard({
                  ...editingCard,
                  extractedData: { ...editingCard.extractedData, company: e.target.value }
                })}
                fullWidth
              />
              <TextField
                label="役職"
                value={editingCard.extractedData.role}
                onChange={(e) => setEditingCard({
                  ...editingCard,
                  extractedData: { ...editingCard.extractedData, role: e.target.value }
                })}
                fullWidth
              />
              <TextField
                label="メール"
                value={editingCard.extractedData.email}
                onChange={(e) => setEditingCard({
                  ...editingCard,
                  extractedData: { ...editingCard.extractedData, email: e.target.value }
                })}
                fullWidth
              />
              <TextField
                label="電話"
                value={editingCard.extractedData.phone}
                onChange={(e) => setEditingCard({
                  ...editingCard,
                  extractedData: { ...editingCard.extractedData, phone: e.target.value }
                })}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleSaveEdit} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SavedCards;