import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { User, Building, Mail, Phone, Briefcase, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'
import { ParsedCardData } from '../helpers/parseCard'
import { useCardStore } from '../hooks/useCardStore'

// バリデーションスキーマ
const cardDataSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください'),
  company: z.string().max(200, '会社名は200文字以内で入力してください'),
  role: z.string().max(100, '役職は100文字以内で入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  phone: z.string().max(50, '電話番号は50文字以内で入力してください')
})

type CardDataForm = z.infer<typeof cardDataSchema>

interface EditFormProps {
  cardId: string
  onGenerateEmail: () => void
  isGenerating?: boolean
  className?: string
}

const InputField = ({
  label,
  icon: Icon,
  error,
  required = false,
  ...props
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  error?: string
  required?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-foreground flex items-center gap-2">
      <Icon className="h-4 w-4" />
      {label}
      {required && <span className="text-destructive">*</span>}
    </label>
    <input
      {...props}
      className={cn(
        "w-full px-3 py-2 text-sm border rounded-md transition-colors",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        error 
          ? "border-destructive focus:ring-destructive" 
          : "border-input hover:border-ring"
      )}
    />
    {error && (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" />
        {error}
      </div>
    )}
  </div>
)

export default function EditForm({ 
  cardId, 
  onGenerateEmail, 
  isGenerating = false,
  className 
}: EditFormProps) {
  const { selectedCard, updateExtractedData } = useCardStore()
  
  const card = selectedCard && selectedCard.id === cardId ? selectedCard : null
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty, isValid },
    reset
  } = useForm<CardDataForm>({
    resolver: zodResolver(cardDataSchema),
    defaultValues: {
      name: '',
      company: '',
      role: '',
      email: '',
      phone: ''
    },
    mode: 'onChange'
  })
  
  // カードデータが変更されたときにフォームを更新
  React.useEffect(() => {
    if (card?.extractedData) {
      const data = card.extractedData
      reset({
        name: data.name || '',
        company: data.company || '',
        role: data.role || '',
        email: data.email || '',
        phone: data.phone || ''
      })
    }
  }, [card?.extractedData, reset])
  
  // フォームデータをリアルタイムで保存
  const formData = watch()
  React.useEffect(() => {
    if (isDirty && card) {
      const timer = setTimeout(() => {
        updateExtractedData(card.id, formData)
      }, 500) // 500ms後に自動保存
      
      return () => clearTimeout(timer)
    }
  }, [formData, isDirty, card, updateExtractedData])
  
  const onSubmit = (data: CardDataForm) => {
    if (card) {
      updateExtractedData(card.id, data)
      onGenerateEmail()
    }
  }
  
  const confidenceColor = card?.extractedData.confidence 
    ? card.extractedData.confidence >= 0.8 ? 'success'
    : card.extractedData.confidence >= 0.6 ? 'warning'
    : 'destructive'
    : 'secondary'
  
  const confidenceText = card?.extractedData.confidence 
    ? `${Math.round(card.extractedData.confidence * 100)}%`
    : '不明'
  
  if (!card) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">名刺を選択してください</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">名刺情報の編集</CardTitle>
          <Badge variant={confidenceColor} className="text-xs">
            精度: {confidenceText}
          </Badge>
        </div>
        
        {/* サムネイル表示 */}
        {card.thumbnailUrl && (
          <div className="mt-3">
            <img
              src={card.thumbnailUrl}
              alt={card.fileName}
              className="w-full max-w-sm h-32 object-contain bg-muted rounded-lg border"
            />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 名前 */}
          <InputField
            label="名前"
            icon={User}
            required
            placeholder="山田 太郎"
            {...register('name')}
            error={errors.name?.message}
          />
          
          {/* 会社名 */}
          <InputField
            label="会社名"
            icon={Building}
            placeholder="株式会社サンプル"
            {...register('company')}
            error={errors.company?.message}
          />
          
          {/* 役職 */}
          <InputField
            label="役職"
            icon={Briefcase}
            placeholder="営業部長"
            {...register('role')}
            error={errors.role?.message}
          />
          
          {/* メールアドレス */}
          <InputField
            label="メールアドレス"
            icon={Mail}
            type="email"
            required
            placeholder="yamada@example.com"
            {...register('email')}
            error={errors.email?.message}
          />
          
          {/* 電話番号 */}
          <InputField
            label="電話番号"
            icon={Phone}
            type="tel"
            placeholder="03-1234-5678"
            {...register('phone')}
            error={errors.phone?.message}
          />
          
          {/* 生成ボタン */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="pt-4"
          >
            <Button
              type="submit"
              disabled={!isValid || isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="mr-2"
                  >
                    <Mail className="h-4 w-4" />
                  </motion.div>
                  メール生成中...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  メールを生成
                </>
              )}
            </Button>
          </motion.div>
        </form>
        
        {/* 自動保存インジケーター */}
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2"
          >
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            変更内容を自動保存中...
          </motion.div>
        )}
        
        {/* エラー表示 */}
        {card.status === 'failed' && card.error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive mb-1">エラーが発生しました</p>
                <p className="text-xs text-destructive/80">{card.error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}