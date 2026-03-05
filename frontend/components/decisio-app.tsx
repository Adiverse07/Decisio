"use client"

import { useState, useCallback } from "react"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { DataProvider } from "@/lib/data-context"
import { ToastProvider } from "@/lib/toast-context"
import { AppShell } from "@/components/app-shell"
import { LoginPage } from "@/components/pages/login-page"
import { DashboardPage } from "@/components/pages/dashboard-page"
import { ProjectsPage } from "@/components/pages/projects-page"
import { ProjectDetailPage } from "@/components/pages/project-detail-page"
import { AllDecisionsPage } from "@/components/pages/all-decisions-page"
import { DecisionDetailPage } from "@/components/pages/decision-detail-page"
import { DecisionFormPage } from "@/components/pages/decision-form-page"
import { SearchPage } from "@/components/pages/search-page"
import { AdminPage } from "@/components/pages/admin-page"

function AppRouter() {
  const { isAuthenticated, loading } = useAuth()
  const [currentPath, setCurrentPath] = useState("/login")

  const navigate = useCallback(
    (path: string) => {
      setCurrentPath(path)
      window.scrollTo(0, 0)
    },
    []
  )

  // Redirect to dashboard on login
  const handleLogin = useCallback(() => {
    setCurrentPath("/dashboard")
  }, [])

  // Show nothing while checking stored token
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // If not authenticated, show login
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  // Parse current path
  const pathParts = currentPath.split("?")
  const basePath = pathParts[0]
  const queryString = pathParts[1] || ""
  const queryParams = new URLSearchParams(queryString)

  // Route matching
  const segments = basePath.split("/").filter(Boolean)

  let page: React.ReactNode

  if (segments[0] === "dashboard" || basePath === "/") {
    page = <DashboardPage onNavigate={navigate} />
  } else if (segments[0] === "projects" && segments.length === 1) {
    page = <ProjectsPage onNavigate={navigate} />
  } else if (segments[0] === "projects" && segments.length === 2) {
    page = (
      <ProjectDetailPage projectId={segments[1]} onNavigate={navigate} />
    )
  } else if (segments[0] === "decisions" && segments[1] === "new") {
    page = (
      <DecisionFormPage onNavigate={navigate} queryParams={queryParams} />
    )
  } else if (
    segments[0] === "decisions" &&
    segments.length === 3 &&
    segments[2] === "edit"
  ) {
    page = (
      <DecisionFormPage
        decisionId={segments[1]}
        onNavigate={navigate}
        queryParams={queryParams}
      />
    )
  } else if (segments[0] === "decisions" && segments.length === 2) {
    page = (
      <DecisionDetailPage decisionId={segments[1]} onNavigate={navigate} />
    )
  } else if (segments[0] === "decisions" && segments.length === 1) {
    page = <AllDecisionsPage onNavigate={navigate} />
  } else if (segments[0] === "search") {
    page = <SearchPage onNavigate={navigate} />
  } else if (segments[0] === "admin") {
    page = <AdminPage onNavigate={navigate} />
  } else {
    page = <DashboardPage onNavigate={navigate} />
  }

  return (
    <AppShell currentPath={basePath} onNavigate={navigate}>
      {page}
    </AppShell>
  )
}

export function DecisioApp() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  )
}
