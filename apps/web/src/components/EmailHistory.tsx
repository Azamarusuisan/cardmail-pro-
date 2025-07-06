import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider } from '@mui/material';
import { Visibility, Email, Person } from '@mui/icons-material';
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

const EmailHistory: React.FC = () => {
  const [sentCards, setSentCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<SavedCard | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchSentCards();
  }, []);

  const fetchSentCards = async () => {
    try {
      const response = await fetch('/api/cards/history/sent');
      if (response.ok) {
        const cardsData = await response.json();
        setSentCards(cardsData);
      } else {
        console.error('Failed to fetch sent cards');
      }
    } catch (error) {
      console.error('Error fetching sent cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (card: SavedCard) => {
    setSelectedCard(card);
    setDetailDialogOpen(true);
  };

  const getToneText = (tone: string) => {
    switch (tone) {
      case 'professional': return 'ビジネス';
      case 'friendly': return 'フレンドリー';
      case 'casual': return 'カジュアル';
      default: return tone;
    }
  };

  const getLanguageText = (language: string) => {
    switch (language) {
      case 'ja': return '日本語';
      case 'en': return '英語';
      default: return language;
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
        送信済みメール履歴
      </Typography>
      
      {sentCards.length === 0 ? (
        <Typography color="textSecondary">
          送信済みのメールがありません。
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {sentCards.map((card) => (
            <Grid item xs={12} key={card.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flex={1}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {card.extractedData.name || '名前未取得'} ({card.extractedData.company || '会社名未取得'})
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="body2" color="textSecondary">
                            <strong>役職:</strong> {card.extractedData.role || '未取得'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="body2" color="textSecondary">
                            <strong>メール:</strong> {card.extractedData.email || '未取得'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="body2" color="textSecondary">
                            <strong>送信日:</strong> {card.sentAt ? format(new Date(card.sentAt), 'yyyy/MM/dd HH:mm', { locale: ja }) : '未設定'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Box display="flex" gap={1}>
                            {card.emailContent && (
                              <>
                                <Chip 
                                  label={getToneText(card.emailContent.tone)}
                                  size="small"
                                  variant="outlined"
                                />
                                <Chip 
                                  label={getLanguageText(card.emailContent.language)}
                                  size="small"
                                  variant="outlined"
                                />
                              </>
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                      
                      {card.emailContent && (
                        <Box mt={2}>
                          <Typography variant="body2" color="textSecondary">
                            <strong>件名:</strong> {card.emailContent.subject}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="textSecondary"
                            sx={{ 
                              mt: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            <strong>本文:</strong> {card.emailContent.body.replace(/\n/g, ' ')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    
                    <Box display="flex" flexDirection="column" gap={1} ml={2}>
                      <Chip 
                        label="送信済み"
                        color="success"
                        size="small"
                        icon={<Email />}
                      />
                      <IconButton size="small" onClick={() => handleViewDetails(card)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Box>
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
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Person />
            送信済みメール詳細
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCard && (
            <Box>
              <Typography variant="h6" gutterBottom>送信先情報</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>名前:</strong> {selectedCard.extractedData.name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>会社:</strong> {selectedCard.extractedData.company}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>役職:</strong> {selectedCard.extractedData.role}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>メール:</strong> {selectedCard.extractedData.email}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>電話:</strong> {selectedCard.extractedData.phone}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><strong>送信日時:</strong> {selectedCard.sentAt ? format(new Date(selectedCard.sentAt), 'yyyy年MM月dd日 HH:mm', { locale: ja }) : '未設定'}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              
              {selectedCard.emailContent && (
                <>
                  <Typography variant="h6" gutterBottom>送信されたメール内容</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography><strong>件名:</strong> {selectedCard.emailContent.subject}</Typography>
                    <Typography><strong>トーン:</strong> {getToneText(selectedCard.emailContent.tone)}</Typography>
                    <Typography><strong>言語:</strong> {getLanguageText(selectedCard.emailContent.language)}</Typography>
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom>本文:</Typography>
                  <Typography 
                    component="pre" 
                    sx={{ 
                      whiteSpace: 'pre-wrap', 
                      bgcolor: 'grey.100', 
                      p: 2, 
                      borderRadius: 1,
                      fontSize: '0.875rem',
                      mb: 3
                    }}
                  >
                    {selectedCard.emailContent.body}
                  </Typography>
                </>
              )}

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>元の名刺データ</Typography>
              <Typography><strong>信頼度:</strong> {(selectedCard.extractedData.confidence * 100).toFixed(1)}%</Typography>
              <Typography><strong>ファイル名:</strong> {selectedCard.fileName}</Typography>
              <Typography><strong>作成日:</strong> {format(new Date(selectedCard.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}</Typography>
              
              <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>OCRテキスト:</Typography>
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailHistory;