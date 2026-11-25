"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import {
  addUserAction,
  changeUserRoleAction,
  deleteUserAction,
} from "@/actions/users";
import { useT } from "@/components/I18nProvider";
import { LoadingDots } from "@/components/LoadingDots";
import { APP_ROLES, type AppRole } from "@/lib/auth/roles";
import { filterUsers, type UserRoleFilter } from "@/lib/auth/user-filters";
import type { MessageKey } from "@/lib/i18n/dictionaries/en";
import { toErrorState, type ErrorState } from "@/lib/i18n/errors";

type ManagedUser = {
  id: string;
  email: string | null;
  emailVerifiedAt: string | null;
  role: AppRole;
};

const ROLE_KEYS = {
  admin: "roles.admin",
  presenter: "roles.presenter",
  attendee: "roles.attendee",
} as const satisfies Record<AppRole, MessageKey>;

function UserRoleEditor({
  user,
  isCurrentUser,
}: {
  user: ManagedUser;
  isCurrentUser: boolean;
}) {
  const t = useT();
  const [role, setRole] = useState(user.role);
  const [error, setError] = useState<ErrorState | null>(null);
  const [pending, startTransition] = useTransition();

  function onChange(nextRole: string) {
    setRole(nextRole as AppRole);
    setError(null);
    startTransition(async () => {
      const result = await changeUserRoleAction(user.id, nextRole);
      if (!result.ok) {
        setRole(user.role);
        setError(toErrorState(result, "errors.users.roleUpdateFailed"));
      }
    });
  }

  return (
    <div className="flex min-w-32 flex-col gap-1">
      <label
        htmlFor={`role-${user.id}`}
        className="text-muted text-xs font-bold"
      >
        {isCurrentUser ? t("users.yourRole") : t("users.roleLabel")}
      </label>
      <select
        id={`role-${user.id}`}
        value={role}
        disabled={pending}
        aria-label={t("users.roleAria", {
          email: user.email ?? t("users.thisUser"),
        })}
        onChange={(event) => onChange(event.target.value)}
        className="select disabled:opacity-60"
      >
        {APP_ROLES.map((option) => (
          <option key={option} value={option}>
            {t(ROLE_KEYS[option])}
          </option>
        ))}
      </select>
      {pending ? (
        <span role="status" className="text-muted text-xs font-bold">
          {t("users.saving")}
        </span>
      ) : error ? (
        <span role="alert" className="text-red max-w-48 text-xs font-bold">
          {t(error.key, error.params)}
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
  const t = useT();
  const [emailFilter, setEmailFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("all");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<AppRole>("attendee");
  const [addError, setAddError] = useState<ErrorState | null>(null);
  const [addNotice, setAddNotice] = useState<MessageKey | null>(null);
  const [addPending, startAddTransition] = useTransition();
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{
    id: string;
    error: ErrorState;
  } | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  const roleFilters: { value: UserRoleFilter; label: MessageKey }[] = [
    { value: "all", label: "roster.filter.all" },
    ...APP_ROLES.map((role) => ({
      value: role,
      label: ROLE_KEYS[role],
    })),
  ];

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
          error: toErrorState(result, "errors.users.deleteFailed"),
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
        setAddError(toErrorState(result, "errors.users.createFailed"));
        return;
      }
      addDialogRef.current?.close();
      setAddEmail("");
      setAddRole("attendee");
      setAddNotice(result.warningKey ?? "users.addedNotice");
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display text-ink text-lg">
              {t("users.title")}
            </h2>
            <span className="section-label">
              {t(users.length === 1 ? "users.count.one" : "users.count.other", {
                count: users.length,
              })}
            </span>
          </div>
          <button type="button" onClick={openAddUser} className="btn btn-small">
            {t("users.add")}
          </button>
        </div>

        {addNotice ? (
          <p role="status" className="text-green text-sm font-bold">
            {t(addNotice)}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label htmlFor="user-email-filter" className="section-label">
                {t("users.filterEmail")}
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
                  placeholder={t("users.emailPlaceholder")}
                  className="input pr-10"
                />
                {emailFilter ? (
                  <button
                    type="button"
                    aria-label={t("users.clearEmailFilter")}
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
                {t("users.filterRole")}
              </span>
              <div
                role="group"
                aria-labelledby="role-filter-label"
                className="flex flex-wrap gap-1.5"
              >
                {roleFilters.map((option) => {
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
                      {t(option.label)}
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
              {t(
                users.length === 1
                  ? "users.showing.one"
                  : "users.showing.other",
                {
                  visible: visibleUsers.length,
                  total: users.length,
                },
              )}
              {filtersActive ? t("users.showingFiltered") : ""}
            </p>
            {filtersActive ? (
              <button type="button" onClick={clearFilters} className="linky">
                {t("users.clearFilters")}
              </button>
            ) : null}
          </div>
        </div>

        {users.length === 0 ? (
          <p className="empty">{t("users.none")}</p>
        ) : visibleUsers.length === 0 ? (
          <div className="empty flex flex-col items-center gap-3">
            <p>{t("users.noneMatch")}</p>
            <button
              type="button"
              onClick={clearFilters}
              className="btn btn-ghost btn-small"
            >
              {t("users.clearFilters")}
            </button>
          </div>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,1fr)_9rem_5.5rem] gap-4 px-4 pt-1 pb-2 sm:grid"
            >
              <span className="section-label">{t("users.table.user")}</span>
              <span className="section-label">{t("users.table.role")}</span>
              <span className="section-label justify-end">
                {t("users.table.delete")}
              </span>
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
                        {user.email ?? t("common.noEmail")}
                        {user.id === currentUserId ? t("common.you") : ""}
                      </span>
                      {user.emailVerifiedAt ? (
                        <span className="chip chip-slide mt-1 w-fit">
                          {t("users.emailVerified")}
                        </span>
                      ) : (
                        <span className="chip chip-soft-amber mt-1 w-fit">
                          {t("users.emailNotVerified")}
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
                          aria-label={t("users.deleteAria", {
                            email: user.email ?? t("users.thisUser"),
                          })}
                          onClick={() => {
                            setDeleteError(null);
                            setConfirmingId(user.id);
                          }}
                          className="btn btn-danger btn-small sm:justify-self-end"
                        >
                          {t("common.delete")}
                        </button>
                      )}
                    </div>
                  </div>

                  {confirmingId === user.id ? (
                    <div
                      role="alertdialog"
                      aria-label={t("users.deleteAria", {
                        email: user.email ?? t("users.thisUser"),
                      })}
                      className="border-red bg-redsoft mt-3 flex flex-col gap-3 rounded-lg border-[2.5px] p-3"
                    >
                      <p className="text-reddeep text-sm font-bold">
                        {t("users.deleteConfirm", {
                          email: user.email ?? t("users.thisUser"),
                        })}
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
                              {t("users.deleting")} <LoadingDots />
                            </>
                          ) : (
                            t("users.yesDelete")
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
                          {t("common.cancel")}
                        </button>
                      </div>
                      {deleteError?.id === user.id ? (
                        <p role="alert" className="text-red text-sm font-bold">
                          {t(deleteError.error.key, deleteError.error.params)}
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
                {t("users.addTitle")}
              </h2>
              <p className="text-muted mt-1 text-xs font-semibold">
                {t("users.addDetail")}
              </p>
            </div>
            <button
              type="button"
              onClick={closeAddUser}
              aria-label={t("common.close")}
              className="text-muted hover:text-ink focus-visible:outline-ink -mt-1 -mr-1 rounded-md px-2 py-1 text-xl leading-none font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              ×
            </button>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="section-label">{t("users.email")}</span>
            <input
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={addEmail}
              onChange={(event) => setAddEmail(event.target.value)}
              placeholder={t("users.emailPlaceholder")}
              className="input"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="section-label">{t("users.roleLabel")}</span>
            <select
              value={addRole}
              onChange={(event) => setAddRole(event.target.value as AppRole)}
              className="select w-full"
            >
              {APP_ROLES.map((option) => (
                <option key={option} value={option}>
                  {t(ROLE_KEYS[option])}
                </option>
              ))}
            </select>
          </label>

          {addRole === "admin" ? (
            <p className="text-amberdeep text-xs font-bold">
              {t("users.adminNotice")}
            </p>
          ) : null}

          {addError ? (
            <p role="alert" className="alert alert-err">
              {t(addError.key, addError.params)}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeAddUser}
              disabled={addPending}
              className="btn btn-ghost"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={addPending || addEmail.trim().length === 0}
              className="btn"
            >
              {addPending ? (
                <>
                  {t("users.adding")} <LoadingDots />
                </>
              ) : (
                t("users.addUser")
              )}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
