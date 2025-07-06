import { Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
// import { motion } from 'framer-motion'
const motion = { div: 'div' as any }
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'

type JobStatus = 'queued' | 'processing' | 'ocr' | 'generating' | 'sending' | 'sent' | 'failed'

interface StatusBadgeProps {
  status: JobStatus
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig: Record<JobStatus, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'
  icon: React.ComponentType<{ className?: string }>
  animated?: boolean
}> = {
  queued: {
    label: '待機中',
    variant: 'secondary',
    icon: Clock,
  },
  processing: {
    label: '処理中',
    variant: 'default',
    icon: Loader2,
    animated: true,
  },
  ocr: {
    label: 'OCR実行中',
    variant: 'info',
    icon: Loader2,
    animated: true,
  },
  generating: {
    label: 'メール生成中',
    variant: 'warning',
    icon: Loader2,
    animated: true,
  },
  sending: {
    label: '送信中',
    variant: 'info',
    icon: Loader2,
    animated: true,
  },
  sent: {
    label: '送信完了',
    variant: 'success',
    icon: CheckCircle,
  },
  failed: {
    label: '失敗',
    variant: 'destructive',
    icon: AlertCircle,
  },
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status]
  const IconComponent = config.icon

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Badge 
        variant={config.variant}
        className={cn(
          "flex items-center gap-1.5 font-medium",
          size === 'sm' && "text-xs px-2 py-0.5",
          size === 'md' && "text-xs px-2.5 py-1",
          size === 'lg' && "text-sm px-3 py-1.5",
          config.animated && "animate-pulse"
        )}
      >
        <IconComponent 
          className={cn(
            "flex-shrink-0",
            size === 'sm' && "h-3 w-3",
            size === 'md' && "h-3.5 w-3.5",
            size === 'lg' && "h-4 w-4",
            config.animated && "animate-spin"
          )}
        />
        {config.label}
      </Badge>
    </motion.div>
  )
}