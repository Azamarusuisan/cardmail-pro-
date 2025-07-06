import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { useSettings } from '../../context/SettingsContext';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const emailLengthMarks = [
  { value: 0, label: '短い' },
  { value: 50, label: '標準' },
  { value: 100, label: '長い' },
];

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();

  const handleGPTModelChange = (event: any) => {
    updateSettings({ gptModel: event.target.value });
  };

  const handleEmailLengthChange = (_: any, value: number | number[]) => {
    const length = value as number;
    let emailLength: 'short' | 'medium' | 'long' = 'medium';
    
    if (length <= 33) emailLength = 'short';
    else if (length <= 66) emailLength = 'medium';
    else emailLength = 'long';
    
    updateSettings({ emailLength });
  };

  const handleAutoSendChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ autoSend: event.target.checked });
  };

  const handleMaxParallelOCRChange = (_: any, value: number | number[]) => {
    updateSettings({ maxParallelOCR: value as number });
  };

  const getEmailLengthValue = () => {
    switch (settings.emailLength) {
      case 'short': return 0;
      case 'medium': return 50;
      case 'long': return 100;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2 }}>
        <Typography variant="h6">設定</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Stack spacing={4}>
          {/* AI Settings */}
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              AI設定
            </Typography>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>GPTモデル</InputLabel>
                <Select
                  value={settings.gptModel}
                  label="GPTモデル"
                  onChange={handleGPTModelChange}
                >
                  <MenuItem value="gpt-4-turbo-preview">GPT-4 Turbo (推奨)</MenuItem>
                  <MenuItem value="gpt-4">GPT-4</MenuItem>
                  <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo (高速)</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Typography gutterBottom>メール文章の長さ</Typography>
                <Slider
                  value={getEmailLengthValue()}
                  onChange={handleEmailLengthChange}
                  marks={emailLengthMarks}
                  step={null}
                  sx={{ mt: 3 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {settings.emailLength === 'short' && '約100文字'}
                  {settings.emailLength === 'medium' && '約150文字'}
                  {settings.emailLength === 'long' && '約200文字'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Processing Settings */}
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              処理設定
            </Typography>
            <Stack spacing={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoSend}
                    onChange={handleAutoSendChange}
                  />
                }
                label="OCR完了後に自動でメール送信"
              />

              <Box>
                <Typography gutterBottom>同時OCR処理数</Typography>
                <Slider
                  value={settings.maxParallelOCR}
                  onChange={handleMaxParallelOCRChange}
                  min={1}
                  max={8}
                  marks
                  valueLabelDisplay="auto"
                  sx={{ mt: 2 }}
                />
                <Typography variant="caption" color="text.secondary">
                  並列処理数: {settings.maxParallelOCR}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Account Settings */}
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              アカウント
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'background.default', 
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
              }}>
                <Typography variant="body2" gutterBottom>
                  Google アカウント
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  接続済み: user@example.com
                </Typography>
              </Box>
              <Button 
                variant="outlined" 
                color="error"
                fullWidth
              >
                アカウントを切断
              </Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained">
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
}