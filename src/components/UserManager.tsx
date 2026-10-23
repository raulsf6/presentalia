"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import {
  addUserAction,
  changeUserRoleAction,
  deleteUserAction,
} from "@/actions/users";
import { LoadingDots } from "@/components/LoadingDots";
import { APP_ROLES, type AppRole } from "@/lib/auth/roles";
import { filterUsers, type UserRoleFilter } from "@/lib/auth/user-filters";

type ManagedUser = {
  id: string;
  email: string | null;
  emailVerifiedAt: string | null;
  role: AppRole;
};

const ROLE_FILTERS: { value: UserRoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...APP_ROLES.map((role) => ({
    value: role,
    label: role[0].toUpperCase() + role.slice(1),
  })),
];

function UserRoleEditor({
  user,
  isCurrentUser,
}: {
  user: ManagedUser;
  isCurrentUser: boolean;
}) {
  const [role, setRole] = useState(user.role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onChange(nextRole: string) {
    setRole(nextRole as AppRole);
    setError(null);
    startTransition(async () => {
      const result = await changeUserRoleAction(user.id, nextRole);
      if (!result.ok) {
        setRole(user.role);
        setError(result.error ?? "Could not update the role.");
      }
    });
  }

  return (
    <div className="flex min-w-32 flex-col gap-1">
      <label
        htmlFor={`role-${user.id}`}
        className="text-muted text-xs font-bold"
      >
        {isCurrentUser ? "Your role" : "Role"}
      </label>
      <select
        id={`role-${user.id}`}
        value={role}
        disabled={pending}
        aria-label={`Role for ${user.email ?? "this user"}`}
        onChange={(event) => onChange(event.target.value)}
        className="select disabled:opacity-60"
      >
        {APP_ROLES.map((option) => (
          <option key={option} value={option}>
            {option[0].toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
      {pending ? (
        <span role="status" className="text-muted text-xs font-bold">
          Saving…
        </span>
      ) : error ? (
        <span role="alert" className="text-red max-w-48 text-xs font-bold">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function UserManager({
  users,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  const [emailFilter, setEmailFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("all");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<AppRole>("attendee");
  const [addError, setAddError] = useState<string | null>(null);
  const [addNotice, setAddNotice] = useState<string | null>(null);
  const [addPending, startAddTransition] = useTransition();
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  const roleCounts = useMemo(() => {
    const counts: Record<UserRoleFilter, number> = {
      all: users.length,
      attendee: 0,
      presenter: 0,
      admin: 0,
    };
    for (const user of users) {
      counts[user.role] += 1;
    }
    return counts;
  }, [users]);

  const visibleUsers = useMemo(
    () => filterUsers(users, { emailQuery: emailFilter, role: roleFilter }),
    [users, emailFilter, roleFilter],
  );
  const filtersActive = emailFilter.trim().length > 0 || roleFilter !== "all";

  function clearFilters() {
    setEmailFilter("");
    setRoleFilter("all");
  }

  function onDelete(user: ManagedUser) {
    setAddNotice(null);
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteUserAction(user.id);
      if (!result.ok) {
        setDeleteError({
          id: user.id,
          message: result.error ?? "Could not delete that user.",
        });
        return;
      }
      setConfirmingId(null);
    });
  }

  function openAddUser() {
    setAddEmail("");
    setAddRole("attendee");
    setAddError(null);
    setAddNotice(null);
    addDialogRef.current?.showModal();
  }

  function closeAddUser() {
    addDialogRef.current?.close();
  }

  function onAddUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddError(null);
    startAddTransition(async () => {
      const result = await addUserAction(addEmail, addRole);
      if (!result.ok) {
        setAddError(result.error ?? "Could not add that user.");
        return;
      }
      addDialogRef.current?.close();
      setAddEmail("");
      setAddRole("attendee");
      setAddNotice(
        result.warning ??
          "User added. They can sign in using this email address.",
      );
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display text-ink text-lg">Users</h2>
            <span className="section-label">
              {users.length} {users.length === 1 ? "user" : "users"}
            </span>
          </div>
          <button type="button" onClick={openAddUser} className="btn btn-small">
            + Add user
          </button>
        </div>

        {addNotice ? (
          <p role="status" className="text-green text-sm font-bold">
            {addNotice}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label htmlFor="user-email-filter" className="section-label">
                Filter by email
              </label>
              <div className="relative">
                <input
                  id="user-email-filter"
                  type="text"
                  inputMode="search"
                  autoComplete="off"
                  spellCheck={false}
                  value={emailFilter}
                  onChange={(event) => setEmailFilter(event.target.value)}
                  placeholder="name@example.com"
                  className="input pr-10"
                />
                {emailFilter ? (
                  <button
                    type="button"
                    aria-label="Clear email filter"
                    onClick={() => setEmailFilter("")}
                    className="text-muted hover:text-ink focus-visible:outline-ink absolute top-1/2 right-2 -translate-y-1/2 rounded px-1.5 text-lg leading-none font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span id="role-filter-label" className="section-label">
                Filter by role
              </span>
              <div
                role="group"
                aria-labelledby="role-filter-label"
                className="flex flex-wrap gap-1.5"
              >
                {ROLE_FILTERS.map((option) => {
                  const selected = roleFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setRoleFilter(option.value)}
                      className={`chip focus-visible:outline-ink cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                        selected
                          ? "bg-ink text-cream"
                          : "text-muted hover:bg-cream2 hover:text-ink bg-white"
                      }`}
                    >
                      {option.label}
                      <span
                        className={selected ? "text-cream/70" : "text-inkfaint"}
                      >
                        {roleCounts[option.value]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p aria-live="polite" className="text-muted text-xs font-semibold">
              Showing {visibleUsers.length} of {users.length}{" "}
              {users.length === 1 ? "user" : "users"}
              {filtersActive ? " matching the filters" : ""}
            </p>
            {filtersActive ? (
              <button type="button" onClick={clearFilters} className="linky">
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        {users.length === 0 ? (
          <p className="empty">No provisioned users yet.</p>
        ) : visibleUsers.length === 0 ? (
          <div className="empty flex flex-col items-center gap-3">
            <p>No users match these filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="btn btn-ghost btn-small"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,1fr)_9rem_5.5rem] gap-4 px-4 pt-1 pb-2 sm:grid"
            >
              <span className="section-label">User</span>
              <span className="section-label">Role</span>
              <span className="section-label justify-end">Delete</span>
            </div>
            <ul className="card divide-ink/10 divide-y-2 divide-dashed overflow-hidden">
              {visibleUsers.map((user) => (
                <li key={user.id} className="px-4 py-3">
                  <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_9rem_5.5rem] sm:items-center sm:gap-4">
                    <div className="flex min-w-0 flex-col">
                      <span
                        className="text-ink truncate font-mono text-sm font-bold"
                        title={user.email ?? undefined}
                      >
                        {user.email ?? "No email address"}
                        {user.id === currentUserId ? " (you)" : ""}
                      </span>
                      {user.emailVerifiedAt ? (
                        <span className="chip chip-slide mt-1 w-fit">
                          ✓ Email verified
                        </span>
                      ) : (
                        <span className="chip chip-soft-amber mt-1 w-fit">
                          ⌛ Email not verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:contents">
                      <UserRoleEditor
                        user={user}
                        isCurrentUser={user.id === currentUserId}
                      />
                      {user.id === currentUserId ||
                      confirmingId === user.id ? null : (
                        <button
                          type="button"
                          aria-label={`Delete ${user.email ?? "user"}`}
                          onClick={() => {
                            setDeleteError(null);
                            setConfirmingId(user.id);
                          }}
                          className="btn btn-danger btn-small sm:justify-self-end"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {confirmingId === user.id ? (
                    <div
                      role="alertdialog"
                      aria-label={`Delete ${user.email ?? "user"}`}
                      className="border-red bg-redsoft mt-3 flex flex-col gap-3 rounded-lg border-[2.5px] p-3"
                    >
                      <p className="text-reddeep text-sm font-bold">
                        Delete{" "}
                        <span className="break-all">
                          {user.email ?? "this user"}
                        </span>
                        ? They lose access immediately, are removed from talk
                        rosters, and their poll and quiz votes are deleted. Text
                        answers are kept in place but replaced with a removal
                        notice, so published rankings do not change. Talks they
                        created stay in the library, without an owner. This
                        cannot be undone.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={deletePending}
                          onClick={() => onDelete(user)}
                          className="btn btn-red btn-small"
                        >
                          {deletePending ? (
                            <>
                              Deleting… <LoadingDots />
                            </>
                          ) : (
                            "Yes, delete user"
                          )}
                        </button>
                        <button
                          type="button"
                          autoFocus
                          disabled={deletePending}
                          onClick={() => {
                            setConfirmingId(null);
                            setDeleteError(null);
                          }}
                          className="btn btn-ghost btn-small"
                        >
                          Cancel
                        </button>
                      </div>
                      {deleteError?.id === user.id ? (
                        <p role="alert" className="text-red text-sm font-bold">
                          {deleteError.message}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <dialog
        ref={addDialogRef}
        aria-labelledby="add-user-title"
        onClose={() => setAddError(null)}
        onClick={(event) => {
          if (event.target === addDialogRef.current) {
            closeAddUser();
          }
        }}
        className="border-ink shadow-hard-lg backdrop:bg-ink/40 m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[10px] border-[3px] bg-white p-0"
      >
        <form onSubmit={onAddUser} className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="add-user-title" className="font-display text-ink text-lg">
                Add a user
              </h2>
              <p className="text-muted mt-1 text-xs font-semibold">
                They get a sign-in link by email.
              </p>
            </div>
            <button
              type="button"
              onClick={closeAddUser}
              aria-label="Close"
              className="text-muted hover:text-ink focus-visible:outline-ink -mt-1 -mr-1 rounded-md px-2 py-1 text-xl leading-none font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              ×
            </button>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="section-label">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={addEmail}
              onChange={(event) => setAddEmail(event.target.value)}
              placeholder="name@example.com"
              className="input"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="section-label">Role</span>
            <select
              value={addRole}
              onChange={(event) => setAddRole(event.target.value as AppRole)}
              className="select w-full"
            >
              {APP_ROLES.map((option) => (
                <option key={option} value={option}>
                  {option[0].toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>

          {addRole === "admin" ? (
            <p className="text-amberdeep text-xs font-bold">
              Admins can manage every user and talk.
            </p>
          ) : null}

          {addError ? (
            <p role="alert" className="alert alert-err">
              {addError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeAddUser}
              disabled={addPending}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addPending || addEmail.trim().length === 0}
              className="btn"
            >
              {addPending ? (
                <>
                  Adding… <LoadingDots />
                </>
              ) : (
                "Add user"
              )}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
