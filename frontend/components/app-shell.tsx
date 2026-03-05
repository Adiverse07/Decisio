import { AppSidebar } from "./app-sidebar"
import type { ReactNode } from "react"

interface AppShellProps {
  children: ReactNode
  currentPath: string
  onNavigate: (path: string) => void
}

export function AppShell({ children, currentPath, onNavigate }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar currentPath={currentPath} onNavigate={onNavigate} />
      <div className="ml-60 flex-1">
        {children}
      </div>
    </div>
  )
}
