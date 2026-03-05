"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface ToastMessage {
  id: string
  title: string
  description?: string
  variant?: "default" | "success" | "destructive"
}

interface ToastContextType {
  toasts: ToastMessage[]
  addToast: (toast: Omit<ToastMessage, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).slice(2, 8)
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg border px-4 py-3 shadow-lg transition-all animate-in slide-in-from-bottom-2 ${
              toast.variant === "destructive"
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : toast.variant === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-border bg-card text-card-foreground"
            }`}
          >
            <p className="text-sm font-medium">{toast.title}</p>
            {toast.description && (
              <p className="mt-1 text-xs opacity-80">{toast.description}</p>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToastNotification() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToastNotification must be used within a ToastProvider")
  }
  return context
}
