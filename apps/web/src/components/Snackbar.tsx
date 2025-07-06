import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

interface SnackbarProps {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  onClose: () => void
  className?: string
}

export default function Snackbar({ 
  message, 
  type = 'info', 
  duration = 4000, 
  onClose,
  className 
}: SnackbarProps) {
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return null
    }
  }
  
  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border",
        "flex items-center gap-3",
        getStyles(),
        className
      )}
    >
      {getIcon()}
      
      <p className="flex-1 text-sm font-medium">{message}</p>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-6 w-6 hover:bg-black/10"
      >
        <X className="h-4 w-4" />
      </Button>
    </motion.div>
  )
}

// Snackbarコンテナーコンポーネント
interface SnackbarContainerProps {
  snackbars: Array<{
    id: string
    message: string
    type?: 'success' | 'error' | 'info'
    duration?: number
  }>
  onRemove: (id: string) => void
}

export function SnackbarContainer({ snackbars, onRemove }: SnackbarContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {snackbars.map((snackbar) => (
          <Snackbar
            key={snackbar.id}
            message={snackbar.message}
            type={snackbar.type}
            duration={snackbar.duration}
            onClose={() => onRemove(snackbar.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}