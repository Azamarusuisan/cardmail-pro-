import { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  CircularProgress,
  Container,
  Stack,
  Alert
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Login() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      handleCallback(code);
    }
  }, []);

  const handleCallback = async (code: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await login(code);
      // Clear the URL params
      window.history.replaceState({}, document.title, "/");
    } catch (err) {
      setError('認証に失敗しました。もう一度お試しください。');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/auth/google');
      window.location.href = response.data.url;
    } catch (err) {
      setError('Googleログインの準備に失敗しました。');
      console.error('Google auth error:', err);
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Card 
          sx={{ 
            borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          }}
        >
          <CardContent sx={{ p: 6 }}>
            <Stack spacing={4} alignItems="center">
              <Box sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="h3" 
                  component="h1" 
                  gutterBottom
                  sx={{ fontWeight: 700, color: 'primary.main' }}
                >
                  CardMail Pro
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  名刺OCRから自動メール送信まで、ビジネスを加速
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ width: '100%' }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ width: '100%' }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={loading ? <CircularProgress size={20} /> : <GoogleIcon />}
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    background: '#4285f4',
                    '&:hover': {
                      background: '#357ae8',
                    },
                  }}
                >
                  {loading ? 'ログイン中...' : 'Googleでログイン'}
                </Button>
              </Box>

              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ textAlign: 'center', mt: 2 }}
              >
                ログインすることで、Gmail送信権限を含む必要な権限を付与します。
                <br />
                あなたの情報は安全に保護されます。
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}