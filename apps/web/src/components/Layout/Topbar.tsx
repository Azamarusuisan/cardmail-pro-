import * as React from 'react'
import { Menu, Settings, Sun, Moon, Command } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

interface TopbarProps {
  onToggleSidebar: () => void
  onOpenSettings: () => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
}

export default function Topbar({
  onToggleSidebar,
  onOpenSettings,
  isDarkMode,
  onToggleDarkMode,
}: TopbarProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenSettings()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onOpenSettings])

  return (
    <header className="main-content h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Page Title */}
          <div className="hidden sm:block">
            <h1 className="text-h2 font-semibold text-foreground">
              Exchange Automation
            </h1>
            <p className="text-sm text-muted-foreground">
              名刺スキャンからメール送信までを自動化
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Keyboard Shortcuts Hint */}
          <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <Command className="h-3 w-3" />
              K
            </kbd>
            <span>設定</span>
          </div>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDarkMode}
            className="relative"
          >
            <Sun className={cn(
              "h-4 w-4 transition-all",
              isDarkMode ? "rotate-90 scale-0" : "rotate-0 scale-100"
            )} />
            <Moon className={cn(
              "absolute h-4 w-4 transition-all",
              isDarkMode ? "rotate-0 scale-100" : "rotate-90 scale-0"
            )} />
            <span className="sr-only">ダークモード切り替え</span>
          </Button>

          {/* Settings Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">設定を開く</span>
          </Button>
        </div>
      </div>
    </header>
  )
}