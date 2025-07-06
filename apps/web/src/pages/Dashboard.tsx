import { useState } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import Sidebar from '../components/Layout/Sidebar';
import MainPanel from '../components/Layout/MainPanel';
import SettingsModal from '../components/Settings/SettingsModal';

export default function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'upload' | 'cards' | 'history'>('upload');

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleSelectHistory = (id: string) => {
    setSelectedHistoryId(id);
  };

  const handleSelectView = (view: 'upload' | 'cards' | 'history') => {
    setCurrentView(view);
    if (view !== 'history') {
      setSelectedHistoryId(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <Sidebar
        open={sidebarOpen}
        onToggle={handleToggleSidebar}
        onOpenSettings={handleOpenSettings}
        onSelectHistory={handleSelectHistory}
        selectedHistoryId={selectedHistoryId}
        onSelectView={handleSelectView}
        currentView={currentView}
      />
      
      <MainPanel
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        selectedHistoryId={selectedHistoryId}
        currentView={currentView}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={handleCloseSettings}
      />
    </Box>
  );
}