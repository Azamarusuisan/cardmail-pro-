import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileImage, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import { extractTextFromImage } from '../../lib/googleVision'
import { parseCard } from '../../helpers/parseCard'
import { useCardStore } from '../../hooks/useCardStore'

// Simple motion replacement
const motion = {
  div: 'div' as any
}
const AnimatePresence = ({ children }: any) => <>{children}</>

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

interface DropZoneProps {
  onFilesDropped: (files: File[]) => void
  isProcessing: boolean
}

export default function DropZone({ onFilesDropped, isProcessing }: DropZoneProps) {
  const [files, setFiles] = useState<File[]>([])
  const { addCard } = useCardStore()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setFiles(acceptedFiles)
    onFilesDropped(acceptedFiles)

    // Process each file with Google Vision API
    for (const file of acceptedFiles) {
      try {
        // Create card with processing status
        const cardId = addCard({
          fileName: file.name,
          thumbnailUrl: URL.createObjectURL(file),
          rawText: '',
          status: 'processing'
        })

        // Extract text using Google Vision API
        const ocrResult = await extractTextFromImage(file)
        
        if (ocrResult.text) {
          // Parse the extracted text
          const parsedData = await parseCard(ocrResult.text)
          
          // Update card with extracted data
          useCardStore.getState().updateCard(cardId, {
            rawText: ocrResult.text,
            extractedData: {
              ...parsedData,
              confidence: Math.max(ocrResult.confidence, parsedData.confidence)
            },
            status: 'reviewing'
          })
        } else {
          // Mark as failed if no text extracted
          useCardStore.getState().updateCard(cardId, {
            status: 'failed'
          })
        }
      } catch (error) {
        console.error('Error processing file:', file.name, error)
        // Handle errors by marking card as failed
      }
    }
  }, [onFilesDropped, addCard])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    multiple: true,
    maxFiles: 20,
    disabled: isProcessing,
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "glass-card p-8 text-center transition-all duration-300 min-h-[200px] flex flex-col items-center justify-center gap-4",
          "border-2 border-dashed cursor-pointer",
          isProcessing && "cursor-not-allowed opacity-60",
          isDragActive && "border-primary bg-primary/5 scale-[1.02]",
          isDragReject && "border-destructive bg-destructive/5",
          !isDragActive && !isDragReject && "border-border hover:border-primary hover:bg-accent/50"
        )}
      >
        <input {...getInputProps()} />
        
        <motion.div
          animate={{ 
            scale: isDragActive ? 1.1 : 1,
            rotate: isDragActive ? 5 : 0,
          }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Upload 
            className={cn(
              "h-16 w-16 mb-4 transition-colors",
              isDragActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        </motion.div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {isDragActive 
              ? 'ドロップしてアップロード' 
              : 'ここに名刺画像をまとめてドロップ'
            }
          </h3>
          <p className="text-sm text-muted-foreground">
            または
          </p>
          <Button 
            disabled={isProcessing}
            className="mt-4"
          >
            ファイルを選択
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            PNG, JPG形式 • 最大20ファイル
          </p>
        </div>

        {isProcessing && (
          <div className="w-full mt-4">
            <div className="h-1 bg-primary/20 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary rounded-full"
                animate={{ x: ['0%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Selected Files */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <h4 className="text-sm font-medium text-foreground">
              選択されたファイル ({files.length}件)
            </h4>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {files.map((file, index) => (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Badge 
                      variant="secondary" 
                      className="px-3 py-1 flex items-center gap-2 text-xs"
                    >
                      <FileImage className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{file.name}</span>
                      <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                        className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}