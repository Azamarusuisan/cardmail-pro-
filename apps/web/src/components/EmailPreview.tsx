import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Send, Copy, Mail } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { cn } from '../lib/utils'
import { EmailContent, generateMail, generateMailStream } from '../helpers/generateMail'
import { useCardStore } from '../hooks/useCardStore'
import { useToast } from '../hooks/use-toast'

interface EmailPreviewProps {
  cardId: string
  onSend: () => void
  isSending?: boolean
  className?: string
}

export default function EmailPreview({ 
  cardId, 
  onSend, 
  isSending = false,
  className 
}: EmailPreviewProps) {
  const [emailContent, setEmailContent] = React.useState<EmailContent | null>(null)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [streamingContent, setStreamingContent] = React.useState('')
  
  const { selectedCard, updateEmailContent } = useCardStore()
  const { toast } = useToast()
  
  const card = selectedCard && selectedCard.id === cardId ? selectedCard : null
  
  // カードのメールコンテンツがある場合はそれを使用
  React.useEffect(() => {
    if (card?.emailContent) {
      setEmailContent(card.emailContent)
    }
  }, [card?.emailContent])
  
  const generateEmail = React.useCallback(async () => {
    if (!card?.extractedData) return
    
    setIsGenerating(true)
    setStreamingContent('')
    
    try {
      // ストリーミング生成でリアルタイムプレビュー
      const stream = generateMailStream(card.extractedData)
      let finalContent: EmailContent | null = null
      
      for await (const chunk of stream) {
        if (chunk.body) {
          setStreamingContent(chunk.body)
        }
        finalContent = chunk as EmailContent
      }
      
      if (finalContent) {
        setEmailContent(finalContent)
        updateEmailContent(card.id, finalContent)
        setStreamingContent('')
      }
    } catch (error) {
      console.error('Email generation failed:', error)
      toast({
        title: 'メール生成エラー',
        description: 'メールの生成に失敗しました。もう一度お試しください。',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }, [card, updateEmailContent, toast])
  
  const regenerateEmail = async () => {
    setEmailContent(null)
    await generateEmail()
  }
  
  const copyToClipboard = async () => {
    if (!emailContent) return
    
    const text = `件名: ${emailContent.subject}\n\n${emailContent.body}`
    
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'コピー完了',
        description: 'メール内容をクリップボードにコピーしました。'
      })
    } catch (error) {
      toast({
        title: 'コピーエラー',
        description: 'クリップボードへのコピーに失敗しました。',
        variant: 'destructive'
      })
    }
  }
  
  // キーボードショートカット
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && emailContent && !isSending) {
        e.preventDefault()
        onSend()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [emailContent, isSending, onSend])
  
  if (!card) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">名刺を選択してください</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">メールプレビュー</CardTitle>
          
          <div className="flex gap-2">
            {emailContent && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  title="コピー"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={regenerateEmail}
                  disabled={isGenerating}
                  title="再生成"
                >
                  <RotateCcw className={cn(
                    "h-4 w-4",
                    isGenerating && "animate-spin"
                  )} />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {!emailContent && !isGenerating && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">メールを生成しましょう</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                名刺情報を確認後、「メールを生成」ボタンをクリックしてフォローアップメールを作成します。
              </p>
              <Button onClick={generateEmail} size="lg">
                <Mail className="mr-2 h-5 w-5" />
                メールを生成
              </Button>
            </motion.div>
          )}
          
          {isGenerating && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RotateCcw className="h-5 w-5 text-primary" />
                </motion.div>
                <span className="text-sm font-medium">メール生成中...</span>
              </div>
              
              {/* ストリーミングプレビュー */}
              {streamingContent && (
                <div className="flex-1 space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">件名（予備）</h4>
                    <p className="text-sm text-muted-foreground">...</p>
                  </div>
                  
                  <div className="flex-1 p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">本文</h4>
                    <div className="text-sm whitespace-pre-wrap font-mono">
                      {streamingContent}
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-2 h-4 bg-primary ml-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
          
          {emailContent && !isGenerating && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col space-y-4"
            >
              {/* 件名 */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">件名</h4>
                <p className="text-base font-medium">{emailContent.subject}</p>
              </div>
              
              {/* 本文 */}
              <div className="flex-1 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">本文</h4>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {emailContent.body}
                </div>
              </div>
              
              {/* 送信ボタン */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3 pt-4"
              >
                <Button
                  onClick={onSend}
                  disabled={isSending}
                  size="lg"
                  className="flex-1"
                >
                  {isSending ? (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="mr-2"
                      >
                        <Send className="h-4 w-4" />
                      </motion.div>
                      送信中...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      送信 (⌘+Enter)
                    </>
                  )}
                </Button>
              </motion.div>
              
              {/* 宛先情報 */}
              <div className="pt-2 text-xs text-muted-foreground text-center">
                送信先: {card.extractedData.email}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}