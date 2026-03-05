"use client"

import { TopBar } from "@/components/top-bar"
import { StatusBadge } from "@/components/status-badge"
import { useData } from "@/lib/data-context"
import {
  FileText,
  CalendarDays,
  AlertCircle,
  ArrowRight,
  Plus,
} from "lucide-react"
import { format } from "date-fns"

interface DashboardPageProps {
  onNavigate: (path: string) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { decisions, projects } = useData()

  const totalDecisions = decisions.length
  const now = new Date()
  const thisMonth = decisions.filter((d) => {
    const created = new Date(d.created_at)
    return (
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    )
  }).length
  const openDecisions = decisions.filter(
    (d) => d.status === "Draft" || d.status === "Proposed"
  ).length

  const recentDecisions = [...decisions]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 8)

  return (
    <div>
      <TopBar title="Dashboard" />
      <main className="mx-auto max-w-[900px] px-8 py-8">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<FileText className="h-5 w-5 text-primary" />}
            label="Total Decisions"
            value={totalDecisions}
          />
          <StatCard
            icon={<CalendarDays className="h-5 w-5 text-primary" />}
            label="Decisions This Month"
            value={thisMonth}
          />
          <StatCard
            icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
            label="Open Decisions"
            value={openDecisions}
          />
        </div>

        {/* Two columns */}
        <div className="mt-8 grid grid-cols-5 gap-6">
          {/* Recent Decisions */}
          <div className="col-span-3">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              Recent Decisions
            </h2>
            <div className="rounded-xl border border-border bg-card">
              {recentDecisions.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => onNavigate(`/decisions/${d.id}`)}
                  className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary ${
                    i !== recentDecisions.length - 1
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
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {d.creator_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(d.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          {/* Your Projects */}
          <div className="col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Your Projects
              </h2>
              <button
                onClick={() => onNavigate("/projects")}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                New Project
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onNavigate(`/projects/${p.id}`)}
                  className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:shadow-sm"
                >
                  <p className="font-medium text-foreground">{p.name}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {p.decision_count} decisions
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(p.updated_at), "MMM d")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}
