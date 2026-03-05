"use client"

import { useState, useMemo } from "react"
import { TopBar } from "@/components/top-bar"
import { StatusBadge } from "@/components/status-badge"
import { useData } from "@/lib/data-context"
import type { DecisionStatus } from "@/lib/types"
import {
  ChevronRight,
  Plus,
  Search,
  FileText,
  ArrowRight,
} from "lucide-react"
import { format } from "date-fns"

interface ProjectDetailPageProps {
  projectId: string
  onNavigate: (path: string) => void
}

export function ProjectDetailPage({
  projectId,
  onNavigate,
}: ProjectDetailPageProps) {
  const { decisions, projects } = useData()
  const numericId = Number(projectId)
  const project = projects.find((p) => p.id === numericId)
  const [activeTab, setActiveTab] = useState<"decisions" | "members">(
    "decisions"
  )
  const [statusFilter, setStatusFilter] = useState<DecisionStatus | "All">(
    "All"
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [tagFilter, setTagFilter] = useState<string[]>([])

  const projectDecisions = useMemo(
    () => decisions.filter((d) => d.project_id === numericId),
    [decisions, numericId]
  )

  const allTags = useMemo(() => {
    const tags = new Map<string, boolean>()
    projectDecisions.forEach((d) =>
      d.tags.forEach((t) => tags.set(t.name, true))
    )
    return Array.from(tags.keys())
  }, [projectDecisions])

  const filteredDecisions = useMemo(() => {
    return projectDecisions.filter((d) => {
      if (statusFilter !== "All" && d.status !== statusFilter) return false
      if (
        searchQuery &&
        !d.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false
      if (
        tagFilter.length > 0 &&
        !tagFilter.some((t) => d.tags.some((dt) => dt.name === t))
      )
        return false
      return true
    })
  }, [projectDecisions, statusFilter, searchQuery, tagFilter])

  const members = useMemo(() => {
    const seen = new Map<number, { id: number; name: string }>()
    projectDecisions.forEach((d) => {
      if (!seen.has(d.created_by)) {
        seen.set(d.created_by, { id: d.created_by, name: d.creator_name })
      }
    })
    return Array.from(seen.values())
  }, [projectDecisions])

  if (!project) {
    return (
      <div>
        <TopBar title="Project Not Found" />
        <main className="mx-auto max-w-[900px] px-8 py-8">
          <p className="text-muted-foreground">This project does not exist.</p>
        </main>
      </div>
    )
  }

  return (
    <div>
      <TopBar title={project.name} />
      <main className="mx-auto max-w-[900px] px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <button
            onClick={() => onNavigate("/projects")}
            className="transition-colors hover:text-foreground"
          >
            Projects
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{project.name}</span>
        </nav>

        <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.description}
        </p>

        {/* Tabs */}
        <div className="mt-6 flex gap-0 border-b border-border">
          <button
            onClick={() => setActiveTab("decisions")}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "decisions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Decisions
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "members"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Members
          </button>
        </div>

        {activeTab === "decisions" ? (
          <div className="mt-6">
            {/* Filter bar */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as DecisionStatus | "All")
                }
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Proposed">Proposed</option>
                <option value="Decided">Decided</option>
                <option value="Superseded">Superseded</option>
              </select>

              {allTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() =>
                        setTagFilter((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag]
                        )
                      }
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        tagFilter.includes(tag)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative ml-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search decisions..."
                  className="h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                onClick={() =>
                  onNavigate(`/decisions/new?project=${projectId}`)
                }
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                New Decision
              </button>
            </div>

            {/* Decision list */}
            {filteredDecisions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">
                  No decisions found
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {projectDecisions.length === 0
                    ? "Create the first decision for this project."
                    : "Try adjusting your filters."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card">
                {filteredDecisions.map((d, i) => (
                  <button
                    key={d.id}
                    onClick={() => onNavigate(`/decisions/${d.id}`)}
                    className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary ${
                      i !== filteredDecisions.length - 1
                        ? "border-b border-border"
                        : ""
                    }`}
                  >
                    <StatusBadge status={d.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {d.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {d.creator_name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {format(new Date(d.created_at), "MMM d")}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No members have created decisions in this project yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {m.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {m.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
