import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Clock, CheckCircle, AlertCircle, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { cn, formatRelativeTime, truncateText } from '../lib/utils'
import { usePendingCards, useSentCards, useSelectedCard, useCardStore } from '../hooks/useCardStore'
import { BusinessCard, CardStatus } from '../hooks/useCardStore'

interface ReviewSidebarProps {
  className?: string
}

const StatusIcon = ({ status }: { status: CardStatus }) => {
  switch (status) {
    case 'pending':
    case 'reviewing':
      return <Clock className="h-4 w-4" />
    case 'generating':
      return <RotateCcw className="h-4 w-4 animate-spin" />
    case 'ready':
      return <CheckCircle className="h-4 w-4" />
    case 'failed':
      return <AlertCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const CardListItem = ({ 
  card, 
  isSelected, 
  onClick 
}: { 
  card: BusinessCard
  isSelected: boolean
  onClick: () => void 
}) => {
  const { removeCard, moveCardToBottom } = useCardStore()
  
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeCard(card.id)
  }
  
  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation()
    moveCardToBottom(card.id)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative p-3 rounded-lg border cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-primary/50",
        isSelected && "bg-primary/5 border-primary shadow-sm"
      )}
      onClick={onClick}
    >
      {/* サムネイルとメイン情報 */}
      <div className="flex items-start gap-3">
        {/* サムネイル */}
        <div className="flex-shrink-0">
          {card.thumbnailUrl ? (
            <img
              src={card.thumbnailUrl}
              alt={card.fileName}
              className="w-12 h-8 object-cover rounded border"
            />
          ) : (
            <div className="w-12 h-8 bg-muted rounded border flex items-center justify-center">
              <span className="text-xs text-muted-foreground">名刺</span>
            </div>
          )}
        </div>
        
        {/* メイン情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium truncate">
              {card.extractedData.name || card.fileName}
            </h4>
            <StatusIcon status={card.status} />
          </div>
          
          {card.extractedData.company && (
            <p className="text-xs text-muted-foreground truncate mb-1">
              {card.extractedData.company}
            </p>
          )}
          
          {card.extractedData.email && (
            <p className="text-xs text-muted-foreground truncate">
              {truncateText(card.extractedData.email, 25)}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(card.createdAt)}
            </span>
            
            <Badge 
              variant={
                card.status === 'ready' ? 'success' :
                card.status === 'failed' ? 'destructive' :
                card.status === 'generating' ? 'warning' : 'secondary'
              }
              className="text-xs"
            >
              {card.status === 'pending' && '待機'}
              {card.status === 'reviewing' && 'レビュー'}
              {card.status === 'generating' && '生成中'}
              {card.status === 'ready' && '準備完了'}
              {card.status === 'failed' && 'エラー'}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* アクションボタン */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
          {(card.status === 'pending' || card.status === 'reviewing') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleSkip}
              title="あとで処理"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
          
          {card.status !== 'sending' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleRemove}
              title="削除"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* エラー表示 */}
      {card.status === 'failed' && card.error && (
        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded">
          <p className="text-xs text-destructive">
            {truncateText(card.error, 60)}
          </p>
        </div>
      )}
      
      {/* 選択インジケーター */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-lg" />
      )}
    </motion.div>
  )
}

export default function ReviewSidebar({ className }: ReviewSidebarProps) {
  const pendingCards = usePendingCards()
  const sentCards = useSentCards()
  const selectedCard = useSelectedCard()
  const { selectCard, retryFailedCards, clearSentCards } = useCardStore()
  
  const [activeTab, setActiveTab] = React.useState<'pending' | 'sent'>('pending')
  
  const displayCards = activeTab === 'pending' ? pendingCards : sentCards
  const failedCount = pendingCards.filter(card => card.status === 'failed').length
  
  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">名刺一覧</CardTitle>
        
        {/* タブ */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              activeTab === 'pending' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            処理中 ({pendingCards.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={cn(
              "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              activeTab === 'sent' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            送信済み ({sentCards.length})
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        {/* アクションバー */}
        {activeTab === 'pending' && failedCount > 0 && (
          <div className="px-4 pb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={retryFailedCards}
              className="w-full"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              失敗した{failedCount}件を再試行
            </Button>
          </div>
        )}
        
        {activeTab === 'sent' && sentCards.length > 0 && (
          <div className="px-4 pb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSentCards}
              className="w-full text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              送信済みをクリア
            </Button>
          </div>
        )}
        
        {/* カードリスト */}
        <div className="px-4 pb-4 overflow-y-auto max-h-full">
          {displayCards.length > 0 ? (
            <div className="space-y-2">
              <AnimatePresence>
                {displayCards.map((card) => (
                  <CardListItem
                    key={card.id}
                    card={card}
                    isSelected={selectedCard?.id === card.id}
                    onClick={() => selectCard(card.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                {activeTab === 'pending' ? (
                  <Clock className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'pending' 
                  ? '処理中の名刺はありません'
                  : '送信済みの名刺はありません'
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}