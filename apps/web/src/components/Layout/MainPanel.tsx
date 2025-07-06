import { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Paper,
  Fade,
} from '@mui/material';
import {
  Menu as MenuIcon,
} from '@mui/icons-material';
import DropZone from '../Upload/DropZone';
import ProgressTable from '../Table/ProgressTable';
import SavedCards from '../SavedCards';
import EmailHistory from '../EmailHistory';
import { ProcessingJob } from '../../types';

interface MainPanelProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedHistoryId: string | null;
  currentView: 'upload' | 'cards' | 'history';
}

export default function MainPanel({
  sidebarOpen,
  onToggleSidebar,
  selectedHistoryId,
  currentView,
}: MainPanelProps) {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesDropped = (files: File[]) => {
    // Create initial jobs
    const newJobs: ProcessingJob[] = files.map((file, index) => ({
      id: `job-${Date.now()}-${index}`,
      fileName: file.name,
      file,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
    }));

    setJobs(prev => [...prev, ...newJobs]);
    setIsProcessing(true);

    // Start processing
    // This would trigger the OCR and email sending logic
  };

  const handleRemoveJob = (jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const showHistory = selectedHistoryId !== null;

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* App Bar */}
      <AppBar 
        position="static" 
        elevation={0} 
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={onToggleSidebar}
            sx={{ 
              mr: 2,
              display: { md: 'none' },
              color: 'text.primary',
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              color: 'text.primary',
              fontWeight: 600,
            }}
          >
            {currentView === 'upload' ? '新規バッチ処理' : 
             currentView === 'cards' ? '保存された名刺' : 
             currentView === 'history' ? '送信履歴' : '新規バッチ処理'}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Container maxWidth="xl" sx={{ height: '100%' }}>
          {currentView === 'upload' && (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Drop Zone */}
              <DropZone 
                onFilesDropped={handleFilesDropped}
                isProcessing={isProcessing}
              />

              {/* Progress Table */}
              {jobs.length > 0 && (
                <Fade in={jobs.length > 0}>
                  <Box sx={{ flex: 1, minHeight: 0 }}>
                    <ProgressTable
                      jobs={jobs}
                      onRemoveJob={handleRemoveJob}
                    />
                  </Box>
                </Fade>
              )}
            </Box>
          )}

          {currentView === 'cards' && (
            <Fade in={currentView === 'cards'}>
              <Box sx={{ height: '100%' }}>
                <SavedCards />
              </Box>
            </Fade>
          )}

          {currentView === 'history' && (
            <Fade in={currentView === 'history'}>
              <Box sx={{ height: '100%' }}>
                {selectedHistoryId ? (
                  <Paper sx={{ p: 3, height: '100%' }}>
                    <Typography variant="h5" gutterBottom>
                      履歴詳細
                    </Typography>
                    <Typography color="text.secondary">
                      選択された履歴の詳細情報がここに表示されます。
                    </Typography>
                  </Paper>
                ) : (
                  <EmailHistory />
                )}
              </Box>
            </Fade>
          )}
        </Container>
      </Box>
    </Box>
  );
}