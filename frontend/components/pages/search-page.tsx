"use client"

import { useState, useMemo } from "react"
import { TopBar } from "@/components/top-bar"
import { StatusBadge } from "@/components/status-badge"
import { useData } from "@/lib/data-context"
import { Search, FileText, FolderOpen } from "lucide-react"

interface SearchPageProps {
  onNavigate: (path: string) => void
}

export function SearchPage({ onNavigate }: SearchPageProps) {
  const { decisions, projects } = useData()
  const [query, setQuery] = useState("")

  const results = useMemo(() => {
    if (!query.trim()) return { decisions: [], projects: [] }
    const q = query.toLowerCase()
    return {
      decisions: decisions.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.tags.some((t) => t.name.toLowerCase().includes(q)) ||
          d.context.toLowerCase().includes(q)
      ),
      projects: projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      ),
    }
  }, [query, decisions, projects])

  const hasResults =
    results.decisions.length > 0 || results.projects.length > 0
  const hasQuery = query.trim().length > 0

  return (
    <div>
      <TopBar title="Search" />
      <main className="mx-auto max-w-[900px] px-8 py-8">
        {/* Search bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decisions, projects, or tags..."
            autoFocus
            className="h-12 w-full rounded-xl border border-border bg-card pl-12 pr-4 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {!hasQuery && (
          <div className="flex flex-col items-center py-16 text-center">
            <Search className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              Search decisions, projects, or tags
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start typing to find what you need.
            </p>
          </div>
        )}

        {hasQuery && !hasResults && (
          <div className="flex flex-col items-center py-16 text-center">
            <Search className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              {"No results for '"}{query}{"'"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try different keywords.
            </p>
          </div>
        )}

        {hasQuery && hasResults && (
          <div className="flex flex-col gap-8">
            {results.decisions.length > 0 && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Decisions ({results.decisions.length})
                </h3>
                <div className="rounded-xl border border-border bg-card">
                  {results.decisions.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => onNavigate(`/decisions/${d.id}`)}
                      className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary ${
                        i !== results.decisions.length - 1
                          ? "border-b border-border"
                          : ""
                      }`}
                    >
                      <StatusBadge status={d.status} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {d.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.project_name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {results.projects.length > 0 && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  Projects ({results.projects.length})
                </h3>
                <div className="rounded-xl border border-border bg-card">
                  {results.projects.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => onNavigate(`/projects/${p.id}`)}
                      className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary ${
                        i !== results.projects.length - 1
                          ? "border-b border-border"
                          : ""
                      }`}
                    >
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {p.name}
                        </p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {p.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        {p.decision_count} decisions
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
