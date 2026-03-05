"use client"

import { useMemo } from "react"
import { TopBar } from "@/components/top-bar"
import { StatusBadge } from "@/components/status-badge"
import { useData } from "@/lib/data-context"
import { FileText, ArrowRight } from "lucide-react"
import { format } from "date-fns"

interface AllDecisionsPageProps {
  onNavigate: (path: string) => void
}

export function AllDecisionsPage({ onNavigate }: AllDecisionsPageProps) {
  const { decisions } = useData()

  const sortedDecisions = useMemo(
    () =>
      [...decisions].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
    [decisions]
  )

  return (
    <div>
      <TopBar title="All Decisions" />
      <main className="mx-auto max-w-[900px] px-8 py-8">
        <h2 className="mb-6 text-xl font-bold text-foreground">
          All Decisions
        </h2>

        {sortedDecisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
            <FileText className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">
              No decisions yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Decisions will appear here once created.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card">
            {sortedDecisions.map((d, i) => (
              <button
                key={d.id}
                onClick={() => onNavigate(`/decisions/${d.id}`)}
                className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary ${
                  i !== sortedDecisions.length - 1
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
                  {format(new Date(d.created_at), "MMM d, yyyy")}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
