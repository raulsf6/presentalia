"use client";

import { useState, useTransition } from "react";

import {
  addAttendeeAction,
  addPresenterAction,
  changeUserRoleAction,
} from "@/actions/users";
import { APP_ROLES, type AppRole } from "@/lib/roles";

type ManagedUser = {
  id: string;
  email: string | null;
  emailVerifiedAt: string | null;
  role: AppRole;
};

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
        className="text-xs font-medium text-zinc-500"
      >
        {isCurrentUser ? "Your role" : "Role"}
      </label>
      <select
        id={`role-${user.id}`}
        value={role}
        disabled={pending}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-800 disabled:opacity-60"
      >
        {APP_ROLES.map((option) => (
          <option key={option} value={option}>
            {option[0].toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
      {pending ? (
        <span role="status" className="text-xs text-zinc-500">
          Saving…
        </span>
      ) : error ? (
        <span role="alert" className="max-w-48 text-xs text-red-700">
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
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendeeMessage, setAttendeeMessage] = useState<string | null>(null);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  const [attendeePending, startAttendeeTransition] = useTransition();

  function onAddPresenter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await addPresenterAction(email);
      if (!result.ok) {
        setError(result.error ?? "Could not add that presenter.");
        return;
      }
      setEmail("");
      setMessage(
        result.warning ??
          "Presenter added. They can sign in using this email address.",
      );
    });
  }

  function onAddAttendee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttendeeMessage(null);
    setAttendeeError(null);
    startAttendeeTransition(async () => {
      const result = await addAttendeeAction(attendeeEmail);
      if (!result.ok) {
        setAttendeeError(result.error ?? "Could not add that attendee.");
        return;
      }
      setAttendeeEmail("");
      setAttendeeMessage(
        result.warning ??
          "Attendee account is ready. They can sign in and be assigned to talks later.",
      );
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Add an attendee</h2>
        <p className="text-sm text-zinc-600">
          They can sign in before being assigned to a talk.
        </p>
        <form
          onSubmit={onAddAttendee}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <label className="sr-only" htmlFor="attendee-email">
            Attendee email address
          </label>
          <input
            id="attendee-email"
            type="email"
            autoComplete="email"
            required
            value={attendeeEmail}
            onChange={(event) => setAttendeeEmail(event.target.value)}
            placeholder="attendee@example.com"
            className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
          <button
            type="submit"
            disabled={attendeePending || attendeeEmail.trim().length === 0}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {attendeePending ? "Adding…" : "Add attendee"}
          </button>
        </form>
        {attendeeError ? (
          <p role="alert" className="text-sm text-red-700">
            {attendeeError}
          </p>
        ) : attendeeMessage ? (
          <p role="status" className="text-sm text-emerald-700">
            {attendeeMessage}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Add a presenter</h2>
        <p className="text-sm text-zinc-600">
          They can request a sign-in link using this email address.
        </p>
        <form
          onSubmit={onAddPresenter}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <label className="sr-only" htmlFor="presenter-email">
            Presenter email address
          </label>
          <input
            id="presenter-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="presenter@example.com"
            className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
          <button
            type="submit"
            disabled={pending || email.trim().length === 0}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add presenter"}
          </button>
        </form>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : message ? (
          <p role="status" className="text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Users</h2>
        {users.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            No provisioned users yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-sm text-zinc-800">
                    {user.email ?? "No email address"}
                    {user.id === currentUserId ? " (you)" : ""}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {user.emailVerifiedAt
                      ? "Email verified"
                      : "Email not verified"}
                  </span>
                </div>
                <UserRoleEditor
                  user={user}
                  isCurrentUser={user.id === currentUserId}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
