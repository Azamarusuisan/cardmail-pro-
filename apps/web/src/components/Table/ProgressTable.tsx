import { useMemo, useState } from 'react'
import { Trash2, Mail, User, Building2, ChevronUp, ChevronDown } from 'lucide-react'
// import { motion, AnimatePresence, Reorder } from 'framer-motion'
const motion = { div: 'div' as any }
const AnimatePresence = ({ children }: any) => <>{children}</>
const Reorder = { Group: 'div' as any, Item: 'div' as any }
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import StatusBadge from './StatusBadge'
import { cn, formatRelativeTime, getInitials } from '../../lib/utils'
import { ProcessingJob } from '../../types'

interface ProgressTableProps {
  jobs: ProcessingJob[]
  onRemoveJob: (jobId: string) => void
}

type SortField = 'fileName' | 'status' | 'createdAt'
type SortDirection = 'asc' | 'desc'

export default function ProgressTable({ jobs, onRemoveJob }: ProgressTableProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortField) {
        case 'fileName':
          aValue = a.fileName.toLowerCase()
          bValue = b.fileName.toLowerCase()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime()
          bValue = new Date(b.createdAt || 0).getTime()
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [jobs, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? 
          <ChevronUp className="h-4 w-4" /> : 
          <ChevronDown className="h-4 w-4" />
      )}
    </button>
  )

  if (jobs.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">名刺をアップロードして開始</h3>
          <p className="text-muted-foreground text-center">
            上のドロップゾーンに名刺画像をドロップしてください
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card h-full">
      {/* Header */}
      <div className="border-b border-border/50 p-4">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
          <div className="col-span-1">サムネイル</div>
          <div className="col-span-2">
            <SortButton field="fileName">ファイル名</SortButton>
          </div>
          <div className="col-span-3">宛先</div>
          <div className="col-span-2">メールアドレス</div>
          <div className="col-span-2">
            <SortButton field="status">ステータス</SortButton>
          </div>
          <div className="col-span-1">進行状況</div>
          <div className="col-span-1">操作</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
        <AnimatePresence>
          {sortedJobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className="grid grid-cols-12 gap-4 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors items-center"
            >
              {/* Thumbnail */}
              <div className="col-span-1">
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center overflow-hidden">
                  {job.thumbnailUrl ? (
                    <img
                      src={job.thumbnailUrl}
                      alt={job.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* File Name */}
              <div className="col-span-2">
                <p className="text-sm font-medium truncate" title={job.fileName}>
                  {job.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(new Date(job.createdAt || Date.now()))}
                </p>
              </div>

              {/* Recipient */}
              <div className="col-span-3">
                {job.ocrResult ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                      {getInitials(job.ocrResult.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{job.ocrResult.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{job.ocrResult.company}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>

              {/* Email */}
              <div className="col-span-2">
                <p className="text-sm truncate" title={job.ocrResult?.email}>
                  {job.ocrResult?.email || '-'}
                </p>
              </div>

              {/* Status */}
              <div className="col-span-2">
                <StatusBadge status={job.status} size="sm" />
              </div>

              {/* Progress */}
              <div className="col-span-1">
                {(job.status !== 'sent' && job.status !== 'failed') ? (
                  <div className="space-y-1">
                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">{job.progress}%</p>
                  </div>
                ) : null}
              </div>

              {/* Actions */}
              <div className="col-span-1">
                <div className="flex gap-1">
                  {(job.status === 'queued' || job.status === 'failed') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveJob(job.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {job.status === 'sent' && job.emailId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => console.log('Show email', job.emailId)}
                      className="h-8 w-8"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  )
}