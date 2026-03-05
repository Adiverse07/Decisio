"use client"

import { useState, useMemo } from "react"
import { TopBar } from "@/components/top-bar"
import { useData } from "@/lib/data-context"
import { useToastNotification } from "@/lib/toast-context"
import type { Tag } from "@/lib/types"
import { ChevronRight, Plus, Trash2, X } from "lucide-react"

interface DecisionFormPageProps {
  decisionId?: string
  onNavigate: (path: string) => void
  queryParams?: URLSearchParams
}

/* ── Local form types (arrays for UX, converted to strings for API) ── */

interface FormOption {
  key: string
  title: string
  pros: string[]
  cons: string[]
  is_chosen: boolean
}

function createEmptyOption(): FormOption {
  return {
    key: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: "",
    pros: [""],
    cons: [""],
    is_chosen: false,
  }
}

/** Convert backend option (string pros/cons) to form option (array) */
function toFormOption(opt: { id: number; title: string; pros: string; cons: string; is_chosen: boolean }): FormOption {
  return {
    key: String(opt.id),
    title: opt.title,
    pros: opt.pros ? opt.pros.split("\n").filter(Boolean) : [""],
    cons: opt.cons ? opt.cons.split("\n").filter(Boolean) : [""],
    is_chosen: opt.is_chosen,
  }
}

export function DecisionFormPage({
  decisionId,
  onNavigate,
  queryParams,
}: DecisionFormPageProps) {
  const { decisions, projects, tags: allTags, createDecision, updateDecision, createTag } = useData()
  const { addToast } = useToastNotification()

  const numericId = decisionId ? Number(decisionId) : null
  const existingDecision = numericId
    ? decisions.find((d) => d.id === numericId)
    : null

  const preselectedProject =
    queryParams?.get("project") || (existingDecision?.project_id ? String(existingDecision.project_id) : "")

  const [projectId, setProjectId] = useState(preselectedProject)
  const [title, setTitle] = useState(existingDecision?.title || "")
  const [context, setContext] = useState(existingDecision?.context || "")
  const [options, setOptions] = useState<FormOption[]>(
    existingDecision?.options?.map(toFormOption) || [createEmptyOption(), createEmptyOption()]
  )
  const [finalSummary, setFinalSummary] = useState(
    existingDecision?.final_summary || ""
  )
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    existingDecision?.tags?.map((t) => t.id) || []
  )
  const [tagInput, setTagInput] = useState("")
  const [decisionDate, setDecisionDate] = useState(
    existingDecision?.decision_date
      ? existingDecision.decision_date.split("T")[0]
      : new Date().toISOString().split("T")[0]
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const isEdit = !!decisionId

  // Tags available but not yet selected
  const suggestedTags = useMemo(() => {
    if (!tagInput) return []
    return allTags
      .filter(
        (t) =>
          t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
          !selectedTagIds.includes(t.id)
      )
      .slice(0, 5)
  }, [tagInput, allTags, selectedTagIds])

  const selectedTagObjects = useMemo(
    () => allTags.filter((t) => selectedTagIds.includes(t.id)),
    [allTags, selectedTagIds]
  )

  const updateOption = (
    idx: number,
    field: keyof FormOption,
    value: string | string[] | boolean
  ) => {
    setOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== idx) {
          if (field === "is_chosen" && value === true) {
            return { ...opt, is_chosen: false }
          }
          return opt
        }
        return { ...opt, [field]: value }
      })
    )
  }

  const addListItem = (optIdx: number, field: "pros" | "cons") => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optIdx ? { ...opt, [field]: [...opt[field], ""] } : opt
      )
    )
  }

  const updateListItem = (
    optIdx: number,
    field: "pros" | "cons",
    itemIdx: number,
    value: string
  ) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optIdx
          ? {
              ...opt,
              [field]: opt[field].map((item: string, j: number) =>
                j === itemIdx ? value : item
              ),
            }
          : opt
      )
    )
  }

  const removeListItem = (
    optIdx: number,
    field: "pros" | "cons",
    itemIdx: number
  ) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optIdx
          ? { ...opt, [field]: opt[field].filter((_: string, j: number) => j !== itemIdx) }
          : opt
      )
    )
  }

  const handleAddTag = async (input: string) => {
    const trimmed = input.trim().toLowerCase()
    if (!trimmed) return

    // Check if tag already exists
    const existing = allTags.find((t) => t.name.toLowerCase() === trimmed)
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) {
        setSelectedTagIds((prev) => [...prev, existing.id])
      }
    } else {
      // Create new tag via API
      try {
        const newTag = await createTag(trimmed)
        setSelectedTagIds((prev) => [...prev, newTag.id])
      } catch {
        addToast({ title: "Failed to create tag", variant: "destructive" })
      }
    }
    setTagInput("")
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!projectId) errs.project = "Project is required"
    if (!title.trim()) errs.title = "Title is required"
    if (!context.trim()) errs.context = "Context is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)

    // Convert form options to API shape (join pros/cons into newline-separated strings)
    const apiOptions = options
      .filter((opt) => opt.title.trim())
      .map((opt) => ({
        title: opt.title.trim(),
        pros: opt.pros.filter((p) => p.trim()).join("\n"),
        cons: opt.cons.filter((c) => c.trim()).join("\n"),
        is_chosen: opt.is_chosen,
      }))

    try {
      if (isEdit && numericId) {
        await updateDecision(numericId, {
          title: title.trim(),
          context: context.trim(),
          final_summary: finalSummary.trim(),
          options: apiOptions,
          tag_ids: selectedTagIds,
        })
        addToast({ title: "Decision updated", variant: "success" })
        onNavigate(`/decisions/${decisionId}`)
      } else {
        const decision = await createDecision({
          project_id: Number(projectId),
          title: title.trim(),
          context: context.trim(),
          final_summary: finalSummary.trim() || undefined,
          options: apiOptions,
          tag_ids: selectedTagIds,
        })
        addToast({ title: "Decision created", variant: "success" })
        onNavigate(`/decisions/${decision.id}`)
      }
    } catch (err: any) {
      addToast({ title: err.message || "Failed to save decision", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <TopBar title={isEdit ? "Edit Decision" : "New Decision"} />
      <main className="mx-auto max-w-[720px] px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <button
            onClick={() => onNavigate("/projects")}
            className="transition-colors hover:text-foreground"
          >
            Projects
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">
            {isEdit ? "Edit Decision" : "New Decision"}
          </span>
        </nav>

        <div className="flex flex-col gap-6">
          {/* Project */}
          <FieldWrapper label="Project" required error={errors.project}>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FieldWrapper>

          {/* Title */}
          <FieldWrapper label="Title" required error={errors.title}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Switch API layer to GraphQL"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FieldWrapper>

          {/* Context */}
          <FieldWrapper
            label="Context / Problem"
            required
            error={errors.context}
            hint="What problem are you solving? Why does this decision need to be made?"
          >
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FieldWrapper>

          {/* Options */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Options Considered
            </label>
            <div className="flex flex-col gap-4">
              {options.map((opt, idx) => (
                <div
                  key={opt.key}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <input
                      value={opt.title}
                      onChange={(e) =>
                        updateOption(idx, "title", e.target.value)
                      }
                      placeholder={`Option ${idx + 1} title`}
                      className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="radio"
                        name="chosen"
                        checked={opt.is_chosen}
                        onChange={() =>
                          updateOption(idx, "is_chosen", true)
                        }
                        className="accent-primary"
                      />
                      Chosen
                    </label>
                    {options.length > 2 && (
                      <button
                        onClick={() =>
                          setOptions((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-emerald-600">
                        Pros
                      </p>
                      {opt.pros.map((pro: string, i: number) => (
                        <div key={i} className="mb-1.5 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <input
                            value={pro}
                            onChange={(e) =>
                              updateListItem(idx, "pros", i, e.target.value)
                            }
                            placeholder="Add a pro..."
                            className="h-8 flex-1 rounded border border-input bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                          />
                          {opt.pros.length > 1 && (
                            <button
                              onClick={() => removeListItem(idx, "pros", i)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addListItem(idx, "pros")}
                        className="mt-1 text-xs text-primary hover:underline"
                      >
                        + Add pro
                      </button>
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-red-500">
                        Cons
                      </p>
                      {opt.cons.map((con: string, i: number) => (
                        <div key={i} className="mb-1.5 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                          <input
                            value={con}
                            onChange={(e) =>
                              updateListItem(idx, "cons", i, e.target.value)
                            }
                            placeholder="Add a con..."
                            className="h-8 flex-1 rounded border border-input bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                          />
                          {opt.cons.length > 1 && (
                            <button
                              onClick={() => removeListItem(idx, "cons", i)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addListItem(idx, "cons")}
                        className="mt-1 text-xs text-primary hover:underline"
                      >
                        + Add con
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() =>
                  setOptions((prev) => [...prev, createEmptyOption()])
                }
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add Option
              </button>
            </div>
          </div>

          {/* Final Summary */}
          <FieldWrapper
            label="Final Decision Summary"
            hint="Summarize what was decided and why this option was chosen."
          >
            <textarea
              value={finalSummary}
              onChange={(e) => setFinalSummary(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FieldWrapper>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Tags
            </label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2">
              {selectedTagObjects.map((tag) => (
                <span
                  key={tag.id}
                  className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tag.name}
                  <button
                    onClick={() =>
                      setSelectedTagIds((prev) =>
                        prev.filter((id) => id !== tag.id)
                      )
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault()
                    handleAddTag(tagInput)
                  }
                }}
                placeholder="Type to add tags..."
                className="min-w-[120px] flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            {suggestedTags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {suggestedTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setSelectedTagIds((prev) => [...prev, tag.id])
                      setTagInput("")
                    }}
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date */}
          <FieldWrapper label="Decision Date">
            <input
              type="date"
              value={decisionDate}
              onChange={(e) => setDecisionDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FieldWrapper>
        </div>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 mt-8 flex items-center justify-end gap-3 border-t border-border bg-background py-4">
          <button
            onClick={() => onNavigate(-1 as unknown as string)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Decision"}
          </button>
        </div>
      </main>
    </div>
  )
}

function FieldWrapper({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
