import { motion } from 'framer-motion'
import { Card, CardContent } from './ui/card'
import { cn } from '../lib/utils'

interface SkeletonCardProps {
  count?: number
  className?: string
}

const SkeletonRow = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.3 }}
    className="grid grid-cols-12 gap-4 p-3 rounded-lg border border-border/50 items-center"
  >
    {/* Thumbnail Skeleton */}
    <div className="col-span-1">
      <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
    </div>

    {/* File Name Skeleton */}
    <div className="col-span-2 space-y-2">
      <div className="h-4 bg-muted rounded animate-pulse" />
      <div className="h-3 bg-muted/60 rounded w-16 animate-pulse" />
    </div>

    {/* Recipient Skeleton */}
    <div className="col-span-3 flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 space-y-1">
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="h-3 bg-muted/60 rounded w-24 animate-pulse" />
      </div>
    </div>

    {/* Email Skeleton */}
    <div className="col-span-2">
      <div className="h-4 bg-muted rounded animate-pulse" />
    </div>

    {/* Status Skeleton */}
    <div className="col-span-2">
      <div className="h-6 bg-muted rounded-full w-20 animate-pulse" />
    </div>

    {/* Progress Skeleton */}
    <div className="col-span-1">
      <div className="space-y-1">
        <div className="h-1.5 bg-muted rounded-full animate-pulse" />
        <div className="h-3 bg-muted/60 rounded w-8 mx-auto animate-pulse" />
      </div>
    </div>

    {/* Actions Skeleton */}
    <div className="col-span-1">
      <div className="h-8 w-8 bg-muted rounded animate-pulse" />
    </div>
  </motion.div>
)

export default function SkeletonCard({ count = 3, className }: SkeletonCardProps) {
  return (
    <Card className={cn("glass-card h-full", className)}>
      {/* Header Skeleton */}
      <div className="border-b border-border/50 p-4">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-1">
            <div className="h-4 bg-muted rounded w-16 animate-pulse" />
          </div>
          <div className="col-span-2">
            <div className="h-4 bg-muted rounded w-20 animate-pulse" />
          </div>
          <div className="col-span-3">
            <div className="h-4 bg-muted rounded w-12 animate-pulse" />
          </div>
          <div className="col-span-2">
            <div className="h-4 bg-muted rounded w-24 animate-pulse" />
          </div>
          <div className="col-span-2">
            <div className="h-4 bg-muted rounded w-16 animate-pulse" />
          </div>
          <div className="col-span-1">
            <div className="h-4 bg-muted rounded w-12 animate-pulse" />
          </div>
          <div className="col-span-1">
            <div className="h-4 bg-muted rounded w-8 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Skeleton Rows */}
      <div className="p-2 space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonRow key={index} delay={index * 0.1} />
        ))}
      </div>
    </Card>
  )
}