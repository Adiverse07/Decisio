"use client"

import { useState } from "react"
import { TopBar } from "@/components/top-bar"
import { useData } from "@/lib/data-context"
import { Plus, FolderOpen, X } from "lucide-react"
import { format } from "date-fns"
import { useToastNotification } from "@/lib/toast-context"

interface ProjectsPageProps {
  onNavigate: (path: string) => void
}

export function ProjectsPage({ onNavigate }: ProjectsPageProps) {
  const { projects, createProject } = useData()
  const { addToast } = useToastNotification()
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [nameError, setNameError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async () => {
    setNameError("")
    if (!newName.trim()) {
      setNameError("Project name is required")
      return
    }
    setSubmitting(true)
    try {
      await createProject({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      })
      setNewName("")
      setNewDesc("")
      setShowModal(false)
      addToast({ title: "Project created", variant: "success" })
    } catch (err: any) {
      setNameError(err.message || "Failed to create project")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <TopBar title="Projects" />
      <main className="mx-auto max-w-[900px] px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Projects</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
            <FolderOpen className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">
              No projects yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first project to start tracking decisions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => onNavigate(`/projects/${p.id}`)}
                className="rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <p className="font-semibold text-foreground">{p.name}</p>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                  {p.description || "No description"}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {p.decision_count} decisions
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Updated {format(new Date(p.updated_at), "MMM d")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                New Project
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Project Name <span className="text-destructive">*</span>
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Platform Rewrite"
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {nameError && (
                  <p className="text-xs text-destructive">{nameError}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description of this project..."
                  rows={3}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
