export type DecisionStatus = "Draft" | "Proposed" | "Decided" | "Superseded"

export interface User {
  id: string
  name: string
  email: string
  role: "Admin" | "Member"
  is_admin: boolean
  avatar_initials: string
  created_at: string
  active: boolean
}

export interface Project {
  id: number
  name: string
  description: string
  created_by: number
  creator_name: string
  is_archived: boolean
  decision_count: number
  created_at: string
  updated_at: string
}

export interface Tag {
  id: number
  name: string
  created_at: string
}

export interface Option {
  id: number
  decision_id: number
  title: string
  pros: string
  cons: string
  is_chosen: boolean
  position: number
  created_at: string
}

export interface AuditEntry {
  id: number
  decision_id: number
  actor_id: number
  actor_name: string
  action: string
  old_status: string | null
  new_status: string | null
  note: string | null
  created_at: string
}

export interface Decision {
  id: number
  project_id: number
  project_name: string
  title: string
  context: string
  final_summary: string
  status: DecisionStatus
  created_by: number
  creator_name: string
  decision_date: string
  superseded_by: number | null
  is_deleted: boolean
  created_at: string
  updated_at: string
  options: Option[]
  tags: Tag[]
}
