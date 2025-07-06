import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'
import { useCardStore } from '../hooks/useCardStore'
import { useToast } from '../hooks/use-toast'

interface SendButtonProps {
  cardId: string
  onSend: () => Promise<void>
  disabled?: boolean
  className?: string
}

type SendState = 'idle' | 'sending' | 'sent' | 'error'

export default function SendButton({ 
  cardId, 
  onSend, 
  disabled = false,
  className 
}: SendButtonProps) {
  const [sendState, setSendState] = React.useState<SendState>('idle')
  const [retryCount, setRetryCount] = React.useState(0)
  const [lastError, setLastError] = React.useState<string | null>(null)
  
  const { selectedCard, moveCardToSent, markCardAsFailed } = useCardStore()
  const { toast } = useToast()
  
  const card = selectedCard && selectedCard.id === cardId ? selectedCard : null
  const hasEmailContent = card?.emailContent && card.extractedData.email
  
  const handleSend = async () => {
    if (!card || !hasEmailContent || sendState === 'sending') return
    
    setSendState('sending')
    setLastError(null)
    
    try {
      await onSend()
      
      // 成功時の処理
      setSendState('sent')
      moveCardToSent(card.id)
      
      toast({
        title: '送信完了',
        description: `${card.extractedData.name}さんへのメールを送信しました。`
      })
      
      // 2秒後に状態をリセット
      setTimeout(() => {
        setSendState('idle')
        setRetryCount(0)
      }, 2000)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '送信に失敗しました'
      
      setSendState('error')
      setLastError(errorMessage)
      setRetryCount(prev => prev + 1)
      
      // カードを失敗状態にマーク
      markCardAsFailed(card.id, errorMessage)
      
      toast({
        title: '送信エラー',
        description: errorMessage,
        variant: 'destructive'
      })
      
      // 5秒後にエラー状態をクリア
      setTimeout(() => {
        setSendState('idle')
      }, 5000)
    }
  }
  
  const retry = () => {
    setSendState('idle')
    setLastError(null)
    handleSend()
  }
  
  // キーボードショートカット
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && hasEmailContent && !disabled) {
        e.preventDefault()
        handleSend()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasEmailContent, disabled])
  
  const getButtonContent = () => {
    switch (sendState) {
      case 'sending':
        return {
          icon: (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Send className="h-4 w-4" />
            </motion.div>
          ),
          text: '送信中...',
          variant: 'default' as const,
          disabled: true
        }
      
      case 'sent':
        return {
          icon: (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <CheckCircle className="h-4 w-4" />
            </motion.div>
          ),
          text: '送信完了',
          variant: 'default' as const,
          disabled: true
        }
      
      case 'error':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          text: retryCount > 0 ? `再試行 (${retryCount})` : '再試行',
          variant: 'destructive' as const,
          disabled: false
        }
      
      default:
        return {
          icon: <Send className="h-4 w-4" />,
          text: '送信 (⌘+Enter)',
          variant: 'default' as const,
          disabled: disabled || !hasEmailContent
        }
    }
  }
  
  const buttonConfig = getButtonContent()
  
  return (
    <div className={cn("space-y-2", className)}>
      <motion.div
        whileHover={{ scale: buttonConfig.disabled ? 1 : 1.02 }}
        whileTap={{ scale: buttonConfig.disabled ? 1 : 0.98 }}
      >
        <Button
          onClick={sendState === 'error' ? retry : handleSend}
          disabled={buttonConfig.disabled}
          variant={buttonConfig.variant}
          size="lg"
          className={cn(
            "w-full transition-all duration-200",
            sendState === 'sent' && "bg-green-600 hover:bg-green-700",
            sendState === 'sending' && "cursor-not-allowed"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={sendState}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              {buttonConfig.icon}
              {buttonConfig.text}
            </motion.div>
          </AnimatePresence>
        </Button>
      </motion.div>
      
      {/* ステータス表示 */}
      <AnimatePresence>
        {!hasEmailContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-center"
          >
            <Badge variant="outline" className="text-xs">
              メールを生成してください
            </Badge>
          </motion.div>
        )}
        
        {sendState === 'error' && lastError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-2 bg-destructive/10 border border-destructive/20 rounded text-center"
          >
            <p className="text-xs text-destructive">{lastError}</p>
          </motion.div>
        )}
        
        {retryCount > 0 && sendState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-center"
          >
            <Badge variant="outline" className="text-xs">
              {retryCount}回再試行済み
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 送信先情報 */}
      {card && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            送信先: {card.extractedData.email}
          </p>
          {card.extractedData.name && (
            <p className="text-xs text-muted-foreground">
              {card.extractedData.name}さん
            </p>
          )}
        </div>
      )}
    </div>
  )
}