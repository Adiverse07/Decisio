"use client"

import { useState, useEffect, useCallback } from "react"
import { TopBar } from "@/components/top-bar"
import { useAuth, mapUser } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { User } from "@/lib/types"
import { Plus, X, Shield, User as UserIcon } from "lucide-react"
import { format } from "date-fns"
import { useToastNotification } from "@/lib/toast-context"

interface AdminPageProps {
  onNavigate: (path: string) => void
}

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { user } = useAuth()
  const { addToast } = useToastNotification()
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users")
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState<string | null>(null)

  // Users loaded from backend
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)

  // Invite form
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [invitePassword, setInvitePassword] = useState("")
  const [inviteRole, setInviteRole] = useState<"Admin" | "Member">("Member")
  const [inviteLoading, setInviteLoading] = useState(false)

  // Edit form
  const [editName, setEditName] = useState("")
  const [editRole, setEditRole] = useState<"Admin" | "Member">("Member")
  const [editLoading, setEditLoading] = useState(false)

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.getUsers()
      setAllUsers(data.users.map(mapUser))
    } catch {
      // Don't toast here — it causes infinite re-render loop
      console.error("Failed to load users")
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.is_admin) {
      fetchUsers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.is_admin])

  if (!user?.is_admin) {
    return (
      <div>
        <TopBar title="Admin Panel" />
        <main className="mx-auto max-w-[900px] px-8 py-8">
          <div className="flex flex-col items-center justify-center py-16">
            <Shield className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">
              Access Denied
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You need admin permissions to view this page.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const handleInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) return
    setInviteLoading(true)
    try {
      await api.createUser({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        password: invitePassword.trim(),
        is_admin: inviteRole === "Admin",
      })
      addToast({
        title: `Created ${inviteName}`,
        description: `Account created for ${inviteEmail}`,
        variant: "success",
      })
      setInviteName("")
      setInviteEmail("")
      setInvitePassword("")
      setInviteRole("Member")
      setShowInviteModal(false)
      fetchUsers()
    } catch (err: any) {
      addToast({
        title: "Failed to create user",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setInviteLoading(false)
    }
  }

  const openEdit = (userId: string) => {
    const u = allUsers.find((u) => u.id === userId)
    if (u) {
      setEditName(u.name)
      setEditRole(u.role)
      setShowEditModal(userId)
    }
  }

  const handleEdit = async () => {
    if (!showEditModal) return
    setEditLoading(true)
    try {
      await api.updateUser(Number(showEditModal), {
        name: editName.trim(),
        is_admin: editRole === "Admin",
      })
      addToast({ title: "User updated", variant: "success" })
      setShowEditModal(null)
      fetchUsers()
    } catch (err: any) {
      addToast({
        title: "Failed to update user",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setEditLoading(false)
    }
  }

  const handleToggleActive = async (userId: string) => {
    try {
      await api.toggleUserActive(Number(userId))
      addToast({ title: "User status updated", variant: "success" })
      fetchUsers()
    } catch (err: any) {
      addToast({
        title: "Failed to update status",
        description: err.message,
        variant: "destructive",
      })
    }
  }

  return (
    <div>
      <TopBar title="Admin Panel" />
      <main className="mx-auto max-w-[900px] px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-0 border-b border-border">
          <button
            onClick={() => setActiveTab("users")}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "audit"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Audit Log
          </button>
        </div>

        {activeTab === "users" ? (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-end">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Invite User
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card">
              {/* Table header */}
              <div className="flex items-center border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex-1">Name</span>
                <span className="w-48">Email</span>
                <span className="w-24">Role</span>
                <span className="w-28">Created</span>
                <span className="w-32 text-right">Actions</span>
              </div>
              {usersLoading ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading users...
                </div>
              ) : allUsers.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No users found.
                </div>
              ) : (
              allUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center border-b border-border px-4 py-3 last:border-b-0"
                >
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {u.avatar_initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {u.name}
                      </p>
                      {!u.active && (
                        <span className="text-xs text-destructive">
                          Deactivated
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="w-48 text-sm text-muted-foreground">
                    {u.email}
                  </span>
                  <span className="w-24">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === "Admin"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {u.role === "Admin" ? (
                        <Shield className="h-3 w-3" />
                      ) : (
                        <UserIcon className="h-3 w-3" />
                      )}
                      {u.role}
                    </span>
                  </span>
                  <span className="w-28 text-xs text-muted-foreground">
                    {format(new Date(u.created_at), "MMM d, yyyy")}
                  </span>
                  <div className="flex w-32 items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(u.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(u.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                Audit log will be available once the audit system is built.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Invite User
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Full name"
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Password <span className="text-destructive">*</span>
                </label>
                <input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Role
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      checked={inviteRole === "Member"}
                      onChange={() => setInviteRole("Member")}
                      className="accent-primary"
                    />
                    Member
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      checked={inviteRole === "Admin"}
                      onChange={() => setInviteRole("Admin")}
                      className="accent-primary"
                    />
                    Admin
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteLoading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {inviteLoading ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Edit User
              </h3>
              <button
                onClick={() => setShowEditModal(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Role
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      checked={editRole === "Member"}
                      onChange={() => setEditRole("Member")}
                      className="accent-primary"
                    />
                    Member
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      checked={editRole === "Admin"}
                      onChange={() => setEditRole("Admin")}
                      className="accent-primary"
                    />
                    Admin
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditModal(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={editLoading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
