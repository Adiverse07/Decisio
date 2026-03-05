const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

class ApiClient {
  private token: string | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token")
    }
  }

  setToken(token: string | null) {
    this.token = token
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("token", token)
      } else {
        localStorage.removeItem("token")
      }
    }
  }

  getToken() {
    return this.token
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })

    const data = await res.json()

    if (!res.ok) {
      throw new ApiError(data.error || "Something went wrong", res.status, data)
    }

    return data as T
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    this.setToken(data.token)
    return data
  }

  async me() {
    return this.request<{ user: any }>("/auth/me")
  }

  async logout() {
    try {
      await this.request("/auth/logout", { method: "POST" })
    } finally {
      this.setToken(null)
    }
  }

  // Users (admin)
  async getUsers() {
    return this.request<{ users: any[] }>("/users")
  }

  async createUser(data: {
    name: string
    email: string
    password: string
    is_admin: boolean
  }) {
    return this.request<{ user: any }>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateUser(userId: number, data: Record<string, any>) {
    return this.request<{ user: any }>(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  async toggleUserActive(userId: number) {
    return this.request<{ user: any }>(`/users/${userId}/toggle-active`, {
      method: "PATCH",
    })
  }

  // Projects
  async getProjects(includeArchived = false) {
    const q = includeArchived ? "?include_archived=true" : ""
    return this.request<{ projects: any[] }>(`/projects${q}`)
  }

  async getProject(id: number) {
    return this.request<{ project: any }>(`/projects/${id}`)
  }

  async createProject(data: { name: string; description?: string }) {
    return this.request<{ project: any }>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateProject(id: number, data: Record<string, any>) {
    return this.request<{ project: any }>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  // Decisions
  async getDecisions(params?: {
    project_id?: number
    status?: string
    tag_id?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.project_id) searchParams.set("project_id", String(params.project_id))
    if (params?.status) searchParams.set("status", params.status)
    if (params?.tag_id) searchParams.set("tag_id", String(params.tag_id))
    const q = searchParams.toString()
    return this.request<{ decisions: any[] }>(`/decisions${q ? `?${q}` : ""}`)
  }

  async getDecision(id: number) {
    return this.request<{ decision: any }>(`/decisions/${id}`)
  }

  async createDecision(data: {
    project_id: number
    title: string
    context: string
    final_summary?: string
    options?: { title: string; pros?: string; cons?: string; is_chosen?: boolean }[]
    tag_ids?: number[]
  }) {
    return this.request<{ decision: any }>("/decisions", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateDecision(
    id: number,
    data: {
      title?: string
      context?: string
      final_summary?: string
      options?: { title: string; pros?: string; cons?: string; is_chosen?: boolean }[]
      tag_ids?: number[]
    }
  ) {
    return this.request<{ decision: any }>(`/decisions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  async transitionStatus(id: number, newStatus: string) {
    return this.request<{ decision: any }>(`/decisions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ new_status: newStatus }),
    })
  }

  async supersedeDecision(
    id: number,
    data: { title: string; context: string; reason?: string }
  ) {
    return this.request<{ old_decision: any; new_decision: any }>(
      `/decisions/${id}/supersede`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    )
  }

  async deleteDecision(id: number) {
    return this.request<{ message: string }>(`/decisions/${id}`, {
      method: "DELETE",
    })
  }

  // Tags
  async getTags() {
    return this.request<{ tags: any[] }>("/tags")
  }

  async createTag(name: string) {
    return this.request<{ tag: any }>("/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
  }

  // Audit
  async getDecisionAudit(decisionId: number) {
    return this.request<{ audit: any[] }>(`/decisions/${decisionId}/audit`)
  }

  async getSystemAudit(limit = 50) {
    return this.request<{ audit: any[] }>(`/audit?limit=${limit}`)
  }
}

export class ApiError extends Error {
  status: number
  data: any

  constructor(message: string, status: number, data: any) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

export const api = new ApiClient()
