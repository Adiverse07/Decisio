"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { Decision, Project, Tag } from "./types"
import { api } from "./api"
import { useAuth } from "./auth-context"

interface DataContextType {
  decisions: Decision[]
  projects: Project[]
  tags: Tag[]
  loading: boolean

  refreshDecisions: () => Promise<void>
  refreshProjects: () => Promise<void>
  refreshTags: () => Promise<void>

  createProject: (data: { name: string; description?: string }) => Promise<Project>
  updateProject: (id: number, data: Record<string, any>) => Promise<Project>

  createDecision: (data: {
    project_id: number
    title: string
    context: string
    final_summary?: string
    options?: { title: string; pros?: string; cons?: string; is_chosen?: boolean }[]
    tag_ids?: number[]
  }) => Promise<Decision>

  updateDecision: (
    id: number,
    data: {
      title?: string
      context?: string
      final_summary?: string
      options?: { title: string; pros?: string; cons?: string; is_chosen?: boolean }[]
      tag_ids?: number[]
    }
  ) => Promise<Decision>

  transitionStatus: (id: number, newStatus: string) => Promise<Decision>
  supersedeDecision: (
    id: number,
    data: { title: string; context: string; reason?: string }
  ) => Promise<{ old: Decision; new: Decision }>
  deleteDecision: (id: number) => Promise<void>

  createTag: (name: string) => Promise<Tag>
}

const DataContext = createContext<DataContextType | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  const refreshProjects = useCallback(async () => {
    const res = await api.getProjects()
    setProjects(res.projects)
  }, [])

  const refreshDecisions = useCallback(async () => {
    const res = await api.getDecisions()
    setDecisions(res.decisions)
  }, [])

  const refreshTags = useCallback(async () => {
    const res = await api.getTags()
    setTags(res.tags)
  }, [])

  // Load all data on mount and when auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      setDecisions([])
      setProjects([])
      setTags([])
      setLoading(false)
      return
    }
    async function load() {
      try {
        const [p, d, t] = await Promise.all([
          api.getProjects(),
          api.getDecisions(),
          api.getTags(),
        ])
        setProjects(p.projects)
        setDecisions(d.decisions)
        setTags(t.tags)
      } catch {
        // If API is unreachable, leave empty arrays
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAuthenticated])

  const createProject = useCallback(
    async (data: { name: string; description?: string }) => {
      const res = await api.createProject(data)
      await refreshProjects()
      return res.project
    },
    [refreshProjects]
  )

  const updateProject = useCallback(
    async (id: number, data: Record<string, any>) => {
      const res = await api.updateProject(id, data)
      await refreshProjects()
      return res.project
    },
    [refreshProjects]
  )

  const createDecision = useCallback(
    async (data: Parameters<typeof api.createDecision>[0]) => {
      const res = await api.createDecision(data)
      await Promise.all([refreshDecisions(), refreshProjects()])
      return res.decision
    },
    [refreshDecisions, refreshProjects]
  )

  const updateDecision = useCallback(
    async (id: number, data: Parameters<typeof api.updateDecision>[1]) => {
      const res = await api.updateDecision(id, data)
      await refreshDecisions()
      return res.decision
    },
    [refreshDecisions]
  )

  const transitionStatus = useCallback(
    async (id: number, newStatus: string) => {
      const res = await api.transitionStatus(id, newStatus)
      await refreshDecisions()
      return res.decision
    },
    [refreshDecisions]
  )

  const supersedeDecision = useCallback(
    async (
      id: number,
      data: { title: string; context: string; reason?: string }
    ) => {
      const res = await api.supersedeDecision(id, data)
      await Promise.all([refreshDecisions(), refreshProjects()])
      return { old: res.old_decision, new: res.new_decision }
    },
    [refreshDecisions, refreshProjects]
  )

  const deleteDecision = useCallback(
    async (id: number) => {
      await api.deleteDecision(id)
      await Promise.all([refreshDecisions(), refreshProjects()])
    },
    [refreshDecisions, refreshProjects]
  )

  const createTag = useCallback(
    async (name: string) => {
      const res = await api.createTag(name)
      await refreshTags()
      return res.tag
    },
    [refreshTags]
  )

  return (
    <DataContext.Provider
      value={{
        decisions,
        projects,
        tags,
        loading,
        refreshDecisions,
        refreshProjects,
        refreshTags,
        createProject,
        updateProject,
        createDecision,
        updateDecision,
        transitionStatus,
        supersedeDecision,
        deleteDecision,
        createTag,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
