import * as React from 'react'

interface ToastProps {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToastContextType {
  toast: (props: ToastProps) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    // フォールバック実装
    return {
      toast: ({ title, description, variant }: ToastProps) => {
        console.log(`Toast [${variant || 'default'}]: ${title}`, description)
        // 本番環境では適切なtoast通知ライブラリを使用
        alert(`${title}${description ? `\n${description}` : ''}`)
      }
    }
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = React.useCallback(({ title, description, variant }: ToastProps) => {
    console.log(`Toast [${variant || 'default'}]: ${title}`, description)
    // 本番環境では適切なtoast通知ライブラリを使用
    alert(`${title}${description ? `\n${description}` : ''}`)
  }, [])
  
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
    </ToastContext.Provider>
  )
}