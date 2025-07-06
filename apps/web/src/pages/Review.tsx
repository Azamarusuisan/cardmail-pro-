import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Settings } from 'lucide-react'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import ReviewSidebar from '../components/ReviewSidebar'
import EditForm from '../components/EditForm'
import EmailPreview from '../components/EmailPreview'
import SendButton from '../components/SendButton'
import { usePendingCards, useSelectedCard, useCardStore, useAutoSendEnabled } from '../hooks/useCardStore'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/use-toast'

export default function Review() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const pendingCards = usePendingCards()
  const selectedCard = useSelectedCard()
  const autoSendEnabled = useAutoSendEnabled()
  const { selectCard, updateCard } = useCardStore()
  
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSending, setIsSending] = React.useState(false)
  
  // 初回ロード時に最初のカードを選択
  React.useEffect(() => {
    if (!selectedCard && pendingCards.length > 0) {
      const firstPendingCard = pendingCards.find(card => 
        card.status === 'pending' || card.status === 'reviewing'
      )
      if (firstPendingCard) {
        selectCard(firstPendingCard.id)
        updateCard(firstPendingCard.id, { status: 'reviewing' })
      }
    }
  }, [pendingCards, selectedCard, selectCard, updateCard])
  
  // カードがない場合はダッシュボードにリダイレクト
  React.useEffect(() => {
    if (pendingCards.length === 0) {
      navigate('/')
    }
  }, [pendingCards.length, navigate])
  
  const handleGenerateEmail = async () => {
    if (!selectedCard) return
    
    setIsGenerating(true)
    updateCard(selectedCard.id, { status: 'generating' })
    
    try {
      // EmailPreviewコンポーネント内でメール生成が実行される
      await new Promise(resolve => setTimeout(resolve, 100)) // 状態更新を待つ
      updateCard(selectedCard.id, { status: 'ready' })
    } catch (error) {
      updateCard(selectedCard.id, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'メール生成に失敗しました' 
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  const handleSendEmail = async () => {
    if (!selectedCard || !selectedCard.emailContent) return
    
    setIsSending(true)
    updateCard(selectedCard.id, { status: 'sending' })
    
    try {
      // 実際のGmail API呼び出しをシミュレート
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedCard.extractedData.email,
          subject: selectedCard.emailContent.subject,
          body: selectedCard.emailContent.body,
          cardData: selectedCard.extractedData
        })
      })
      
      if (!response.ok) {
        throw new Error(`送信エラー: ${response.status}`)
      }
      
      const result = await response.json()
      
      // 成功時の処理はSendButtonコンポーネントで実行
      
    } catch (error) {
      throw error // SendButtonコンポーネントでエラーハンドリング
    } finally {
      setIsSending(false)
    }
  }
  
  const handleCardSelect = (cardId: string | null) => {
    if (cardId) {
      selectCard(cardId)
      const card = pendingCards.find(c => c.id === cardId)
      if (card && card.status === 'pending') {
        updateCard(cardId, { status: 'reviewing' })
      }
    }
  }
  
  const handleBackToDashboard = () => {
    navigate('/')
  }
  
  const handleOpenSettings = () => {
    // 設定モーダルを開く処理
    toast({
      title: '設定',
      description: '設定機能は現在開発中です。'
    })
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToDashboard}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div>
              <h1 className="text-xl font-semibold">名刺レビュー & 送信</h1>
              <p className="text-sm text-muted-foreground">
                情報を確認してメールを送信しましょう
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {autoSendEnabled && (
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                自動送信: 有効
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenSettings}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
          {/* サイドバー: 名刺一覧 */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-3"
          >
            <ReviewSidebar />
          </motion.div>
          
          {/* メインエリア */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              {selectedCard ? (
                <motion.div
                  key={selectedCard.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full"
                >
                  {/* 編集フォーム */}
                  <div className="xl:col-span-5">
                    <EditForm
                      cardId={selectedCard.id}
                      onGenerateEmail={handleGenerateEmail}
                      isGenerating={isGenerating}
                    />
                  </div>
                  
                  {/* メールプレビューと送信 */}
                  <div className="xl:col-span-7 flex flex-col gap-6">
                    <div className="flex-1">
                      <EmailPreview
                        cardId={selectedCard.id}
                        onSend={handleSendEmail}
                        isSending={isSending}
                      />
                    </div>
                    
                    {/* 送信ボタン */}
                    <div className="flex-shrink-0">
                      <SendButton
                        cardId={selectedCard.id}
                        onSend={handleSendEmail}
                        disabled={!selectedCard.emailContent || isSending}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-full"
                >
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2">名刺を選択してください</h2>
                    <p className="text-muted-foreground">
                      左のサイドバーから処理したい名刺を選択してください。
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}