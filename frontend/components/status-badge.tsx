import type { DecisionStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusConfig: Record<
  DecisionStatus,
  { bg: string; text: string; dot: string }
> = {
  Draft: {
    bg: "bg-secondary",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  Proposed: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  Decided: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  Superseded: {
    bg: "bg-red-50",
    text: "text-red-600",
    dot: "bg-red-400",
  },
}

export function StatusBadge({
  status,
  className,
}: {
  status: DecisionStatus
  className?: string
}) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {status}
    </span>
  )
}
