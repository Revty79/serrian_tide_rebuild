"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export type AdminRole = {
  id: string;
  name: string;
  description: string | null;
};

export type AdminUser = {
  id: string;
  username: string | null;
  email: string;
  roleId: string;
  createdAt: string;
};

type AdminConsoleProps = {
  initialRoles: AdminRole[];
  initialUsers: AdminUser[];
};

type Notice = {
  type: "success" | "error";
  text: string;
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function AdminConsole({ initialRoles, initialUsers }: AdminConsoleProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleDraftByUser, setRoleDraftByUser] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const roleLabelById = useMemo(
    () =>
      new Map<string, string>(initialRoles.map((role) => [role.id, role.name])),
    [initialRoles]
  );

  const usersByRole = useMemo(() => {
    const counts = new Map<string, number>();
    for (const role of initialRoles) {
      counts.set(role.id, 0);
    }
    for (const user of users) {
      counts.set(user.roleId, (counts.get(user.roleId) ?? 0) + 1);
    }
    return counts;
  }, [initialRoles, users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const username = (user.username ?? "").toLowerCase();
      return (
        user.email.toLowerCase().includes(query) ||
        username.includes(query) ||
        user.id.toLowerCase().includes(query) ||
        user.roleId.toLowerCase().includes(query)
      );
    });
  }, [search, users]);

  async function handleRoleSave(user: AdminUser) {
    const nextRoleId = roleDraftByUser[user.id] ?? user.roleId;
    if (nextRoleId === user.roleId) {
      return;
    }

    setSavingUserId(user.id);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          role: nextRoleId,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; user?: { roleId?: string } }
        | null;

      if (!response.ok) {
        setNotice({
          type: "error",
          text: data?.error ?? "Unable to update role.",
        });
        return;
      }

      setUsers((previous) =>
        previous.map((entry) =>
          entry.id === user.id
            ? { ...entry, roleId: data?.user?.roleId ?? nextRoleId }
            : entry
        )
      );
      setRoleDraftByUser((previous) => {
        const next = { ...previous };
        delete next[user.id];
        return next;
      });
      setNotice({
        type: "success",
        text: `Updated role for ${user.username ?? user.email}.`,
      });
    } catch {
      setNotice({
        type: "error",
        text: "Network error while updating role.",
      });
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card
        padded={false}
        className="rounded-3xl border border-red-400/35 bg-slate-950/70 p-5 shadow-2xl backdrop-blur-xl"
      >
        <h2 className="font-portcullion text-2xl text-red-200">Role Matrix</h2>
        <p className="mt-2 text-sm text-slate-300">
          Manage role assignments for every registered account.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {initialRoles.map((role) => (
            <div
              key={role.id}
              className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3"
            >
              <p className="text-sm font-semibold text-amber-200">{role.name}</p>
              <p className="mt-1 text-xs text-slate-300">{role.description ?? "No description yet."}</p>
              <p className="mt-2 text-xs text-violet-200">
                Users: {usersByRole.get(role.id) ?? 0}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card
        padded={false}
        className="rounded-3xl border border-white/15 bg-slate-950/70 p-5 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-portcullion text-2xl text-amber-200">User Access Control</h2>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search username, email, role, or id"
            className="w-full sm:w-80 rounded-xl border border-slate-600/70 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
        </div>

        {notice ? (
          <p
            className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
              notice.type === "success"
                ? "border-emerald-400/50 bg-emerald-900/30 text-emerald-100"
                : "border-red-400/50 bg-red-900/35 text-red-100"
            }`}
          >
            {notice.text}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {filteredUsers.map((user) => {
            const activeRole = roleDraftByUser[user.id] ?? user.roleId;
            const isSaving = savingUserId === user.id;
            return (
              <div
                key={user.id}
                className="rounded-2xl border border-slate-700/70 bg-slate-900/65 p-3"
              >
                <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      {user.username ?? "No username"}
                    </p>
                    <p className="text-xs text-slate-300">{user.email}</p>
                    <p className="text-[11px] text-slate-400">
                      Created: {formatCreatedAt(user.createdAt)}
                    </p>
                    <p className="text-[11px] text-slate-500">ID: {user.id}</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                      Role
                    </label>
                    <select
                      value={activeRole}
                      onChange={(event) =>
                        setRoleDraftByUser((previous) => ({
                          ...previous,
                          [user.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-600/70 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    >
                      {initialRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isSaving || activeRole === user.roleId}
                      onClick={() => void handleRoleSave(user)}
                    >
                      {isSaving ? "Saving..." : "Save Role"}
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-violet-200">
                  Current: {roleLabelById.get(user.roleId) ?? user.roleId}
                </p>
              </div>
            );
          })}
        </div>

        {filteredUsers.length === 0 ? (
          <p className="mt-4 rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-3 text-sm text-slate-300">
            No users match your current search.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
