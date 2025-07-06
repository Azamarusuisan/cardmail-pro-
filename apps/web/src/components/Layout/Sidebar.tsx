import * as React from 'react'
import { X, Plus, Settings, LogOut, BarChart3, Mail, CreditCard, History } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
// Temporarily disabled framer-motion
// import { motion, AnimatePresence } from 'framer-motion'
const motion = { div: 'div' as any }
const AnimatePresence = ({ children }: any) => <>{children}</>
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { cn, getInitials } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { useMailHistory } from '../../hooks/useMailHistory'

interface SidebarProps {
  open: boolean
  onToggle: () => void
  onOpenSettings: () => void
  onSelectHistory: (id: string | null) => void
  selectedHistoryId: string | null
  onSelectView: (view: 'upload' | 'cards' | 'history') => void
  currentView: 'upload' | 'cards' | 'history'
}

export default function Sidebar({
  open,
  onToggle,
  onOpenSettings,
  onSelectHistory,
  selectedHistoryId,
  onSelectView,
  currentView,
}: SidebarProps) {
  const { user, logout } = useAuth()
  const { history, stats } = useMailHistory()

  const handleLogout = async () => {
    await logout()
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        onToggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onToggle])

  const sidebarContent = (
    <div className="sidebar-width h-full bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-h2 font-semibold text-white">
            CardMail Pro
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-white hover:bg-gray-800 md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <Button
            className={cn(
              "w-full text-white justify-start",
              currentView === 'upload' 
                ? "bg-primary hover:bg-primary/90" 
                : "bg-gray-800 hover:bg-gray-700"
            )}
            onClick={() => {
              onSelectView('upload')
              onSelectHistory(null)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            新規バッチ
          </Button>
          
          <Button
            className={cn(
              "w-full text-white justify-start",
              currentView === 'cards' 
                ? "bg-primary hover:bg-primary/90" 
                : "bg-gray-800 hover:bg-gray-700"
            )}
            onClick={() => onSelectView('cards')}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            保存された名刺
          </Button>
          
          <Button
            className={cn(
              "w-full text-white justify-start",
              currentView === 'history' 
                ? "bg-primary hover:bg-primary/90" 
                : "bg-gray-800 hover:bg-gray-700"
            )}
            onClick={() => onSelectView('history')}
          >
            <History className="mr-2 h-4 w-4" />
            送信履歴
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-800" />

      {/* Stats */}
      <div className="p-6">
        <div className="flex gap-2">
          <Badge variant="success" className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            送信: {stats.sent}
          </Badge>
          <Badge 
            variant={stats.failed > 0 ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            失敗: {stats.failed}
          </Badge>
        </div>
      </div>

      {/* History List - only show when in history view */}
      {currentView === 'history' && (
        <div className="flex-1 overflow-auto px-3">
          <div className="space-y-1">
            <AnimatePresence>
              {history.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <button
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-colors hover:bg-gray-800",
                      selectedHistoryId === item.id && "bg-primary hover:bg-primary/90"
                    )}
                    onClick={() => onSelectHistory(item.id)}
                  >
                    <div className="text-sm font-medium text-white">
                      {format(new Date(item.createdAt), 'MM/dd HH:mm', { locale: ja })}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {item.totalCount}件 • {item.successCount}件成功
                    </div>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
      
      {/* Spacer for other views */}
      {currentView !== 'history' && <div className="flex-1" />}

      {/* Footer */}
      <div className="p-6 border-t border-gray-800">
        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                getInitials(user?.name || '')
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {user?.name}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {user?.email}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={onOpenSettings}
            >
              <Settings className="mr-2 h-4 w-4" />
              設定
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              使用量
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block sidebar-width flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={onToggle}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-full z-50 md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}