"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/top-bar"
import { StatusBadge } from "@/components/status-badge"
import { useData } from "@/lib/data-context"
import { useAuth } from "@/lib/auth-context"
import { useToastNotification } from "@/lib/toast-context"
import { api } from "@/lib/api"
import type { AuditEntry } from "@/lib/types"
import {
  ChevronRight,
  Edit,
  CheckCircle2,
  ArrowRightCircle,
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react"
import { format } from "date-fns"

interface DecisionDetailPageProps {
  decisionId: string
  onNavigate: (path: string) => void
}

export function DecisionDetailPage({
  decisionId,
  onNavigate,
}: DecisionDetailPageProps) {
  const { decisions, transitionStatus, supersedeDecision, deleteDecision } = useData()
  const { user } = useAuth()
  const { addToast } = useToastNotification()
  const numericId = Number(decisionId)
  const decision = decisions.find((d) => d.id === numericId)
  const [showSupersedeModal, setShowSupersedeModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [supersedeTitle, setSupersedeTitle] = useState("")
  const [supersedeContext, setSupersedeContext] = useState("")
  const [supersedeReason, setSupersedeReason] = useState("")
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (numericId) {
      api.getDecisionAudit(numericId).then((res) => setAuditLog(res.audit)).catch(() => {})
    }
  }, [numericId, decision?.status])

  if (!decision) {
    return (
      <div>
        <TopBar title="Decision Not Found" />
        <main className="mx-auto max-w-[900px] px-8 py-8">
          <p className="text-muted-foreground">
            This decision does not exist.
          </p>
        </main>
      </div>
    )
  }

  const handleStatusChange = async (newStatus: string) => {
    setBusy(true)
    try {
      await transitionStatus(numericId, newStatus)
      addToast({ title: `Status changed to ${newStatus}`, variant: "success" })
    } catch (err: any) {
      addToast({ title: err.message || "Failed to change status", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const handleSupersede = async () => {
    if (!supersedeTitle.trim() || !supersedeContext.trim()) {
      addToast({ title: "Title and context are required", variant: "destructive" })
      return
    }
    setBusy(true)
    try {
      const result = await supersedeDecision(numericId, {
        title: supersedeTitle.trim(),
        context: supersedeContext.trim(),
        reason: supersedeReason || undefined,
      })
      setShowSupersedeModal(false)
      addToast({ title: "Decision superseded — new Draft created", variant: "success" })
      onNavigate(`/decisions/${result.new.id}`)
    } catch (err: any) {
      addToast({ title: err.message || "Failed to supersede", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deleteDecision(numericId)
      setShowDeleteModal(false)
      addToast({ title: "Decision deleted", variant: "success" })
      onNavigate("/decisions")
    } catch (err: any) {
      addToast({ title: err.message || "Failed to delete", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const supersedingDecision = decision.superseded_by
    ? decisions.find((d) => d.id === decision.superseded_by)
    : null

  // Helper to split pros/cons text into lines for display
  const splitLines = (text: string | null | undefined): string[] => {
    if (!text) return []
    return text.split("\n").filter((l) => l.trim())
  }

  return (
    <div>
      <TopBar title={decision.title} />
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
          <button
            onClick={() =>
              onNavigate(`/projects/${decision.project_id}`)
            }
            className="transition-colors hover:text-foreground"
          >
            {decision.project_name}
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">
            {decision.title}
          </span>
        </nav>

        {/* Superseded banner */}
        {decision.status === "Superseded" && supersedingDecision && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <span className="text-red-700">
              This decision was superseded by{" "}
              <button
                onClick={() =>
                  onNavigate(`/decisions/${supersedingDecision.id}`)
                }
                className="font-medium underline hover:no-underline"
              >
                {supersedingDecision.title}
              </button>
            </span>
          </div>
        )}

        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {decision.title}
            </h1>
            <StatusBadge status={decision.status} />
          </div>
          <div className="flex items-center gap-2">
            {decision.status === "Draft" && (
              <button
                onClick={() =>
                  onNavigate(`/decisions/${decisionId}/edit`)
                }
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            {decision.status === "Draft" && (
              <button
                onClick={() => handleStatusChange("Proposed")}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <ArrowRightCircle className="h-3.5 w-3.5" />
                Submit for Review
              </button>
            )}
            {decision.status === "Proposed" && user?.is_admin && (
              <button
                onClick={() => handleStatusChange("Decided")}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark as Decided
              </button>
            )}
            {decision.status === "Decided" && (
              <button
                onClick={() => {
                  setSupersedeTitle(decision.title + " (v2)")
                  setSupersedeContext(decision.context)
                  setSupersedeReason("")
                  setShowSupersedeModal(true)
                }}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-opacity hover:bg-red-100"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Supersede
              </button>
            )}
            {user?.is_admin && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-opacity hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Body — 2 columns */}
        <div className="mt-8 grid grid-cols-11 gap-6">
          {/* Left column */}
          <div className="col-span-7 flex flex-col gap-8">
            {/* Context */}
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Why this decision was needed
              </h3>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {decision.context}
              </p>
            </section>

            {/* Options */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Options Considered
              </h3>
              <div className="flex flex-col gap-3">
                {decision.options.map((opt) => {
                  const prosList = splitLines(opt.pros)
                  const consList = splitLines(opt.cons)
                  return (
                    <div
                      key={opt.id}
                      className={`rounded-xl border p-4 ${
                        opt.is_chosen
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">
                          {opt.title}
                        </h4>
                        {opt.is_chosen && (
                          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                            Selected
                          </span>
                        )}
                      </div>
                      {(prosList.length > 0 || consList.length > 0) && (
                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <div>
                            <p className="mb-1.5 text-xs font-medium text-emerald-600">
                              Pros
                            </p>
                            <ul className="flex flex-col gap-1">
                              {prosList.map((pro, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-foreground"
                                >
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="mb-1.5 text-xs font-medium text-red-500">
                              Cons
                            </p>
                            <ul className="flex flex-col gap-1">
                              {consList.map((con, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-foreground"
                                >
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Final Decision */}
            {decision.final_summary && (
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Final Decision
                </h3>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {decision.final_summary}
                </p>
              </section>
            )}
          </div>

          {/* Right column */}
          <div className="col-span-4 flex flex-col gap-4">
            {/* Meta card */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="mb-3 text-sm font-semibold text-foreground">
                Details
              </h4>
              <dl className="flex flex-col gap-2.5">
                <div>
                  <dt className="text-xs text-muted-foreground">Project</dt>
                  <dd>
                    <button
                      onClick={() =>
                        onNavigate(`/projects/${decision.project_id}`)
                      }
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {decision.project_name}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Created by
                  </dt>
                  <dd className="text-sm text-foreground">
                    {decision.creator_name}
                  </dd>
                </div>
                {decision.decision_date && (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Decision date
                    </dt>
                    <dd className="text-sm text-foreground">
                      {format(
                        new Date(decision.decision_date),
                        "MMM d, yyyy"
                      )}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Last updated
                  </dt>
                  <dd className="text-sm text-foreground">
                    {format(
                      new Date(decision.updated_at),
                      "MMM d, yyyy"
                    )}
                  </dd>
                </div>
                {decision.tags.length > 0 && (
                  <div>
                    <dt className="mb-1 text-xs text-muted-foreground">
                      Tags
                    </dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {decision.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Audit log */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="mb-3 text-sm font-semibold text-foreground">
                History
              </h4>
              {auditLog.length === 0 ? (
                <p className="text-xs text-muted-foreground">No history yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                        {entry.actor_name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">
                          <span className="font-medium">
                            {entry.actor_name}
                          </span>{" "}
                          {entry.action}
                          {entry.new_status && (
                            <span className="text-muted-foreground">
                              {" "}→ {entry.new_status}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(
                            new Date(entry.created_at),
                            "MMM d, h:mmaaa"
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Supersede Modal */}
      {showSupersedeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Supersede Decision
              </h3>
              <button
                onClick={() => setShowSupersedeModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              This will mark the current decision as Superseded and create a new
              Draft decision as its replacement.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  New Decision Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={supersedeTitle}
                  onChange={(e) => setSupersedeTitle(e.target.value)}
                  placeholder="Title for the replacement decision"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Context <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={supersedeContext}
                  onChange={(e) => setSupersedeContext(e.target.value)}
                  placeholder="Why is a new decision needed?"
                  rows={3}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Reason for superseding (optional)
                </label>
                <textarea
                  value={supersedeReason}
                  onChange={(e) => setSupersedeReason(e.target.value)}
                  placeholder="Why is the original decision being replaced?"
                  rows={2}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSupersedeModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSupersede}
                disabled={busy || !supersedeTitle.trim() || !supersedeContext.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Confirm Supersede
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Delete Decision
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {decision.title}
              </span>
              ? This decision will be hidden from all views.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
