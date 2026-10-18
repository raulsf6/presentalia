"use client";

import { useState, useTransition } from "react";

import {
  addAttendeeAction,
  addPresenterAction,
  changeUserRoleAction,
} from "@/actions/users";
import { LoadingDots } from "@/components/LoadingDots";
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
        className="text-muted text-xs font-bold"
      >
        {isCurrentUser ? "Your role" : "Role"}
      </label>
      <select
        id={`role-${user.id}`}
        value={role}
        disabled={pending}
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
        <h2 className="font-display text-ink text-lg">Add an attendee</h2>
        <p className="text-muted text-sm font-semibold">
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
            className="input min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={attendeePending || attendeeEmail.trim().length === 0}
            className="btn"
          >
            {attendeePending ? (
              <>
                Adding… <LoadingDots />
              </>
            ) : (
              "Add attendee"
            )}
          </button>
        </form>
        {attendeeError ? (
          <p role="alert" className="text-red text-sm font-bold">
            {attendeeError}
          </p>
        ) : attendeeMessage ? (
          <p role="status" className="text-green text-sm font-bold">
            {attendeeMessage}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-ink text-lg">Add a presenter</h2>
        <p className="text-muted text-sm font-semibold">
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
            className="input min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={pending || email.trim().length === 0}
            className="btn"
          >
            {pending ? (
              <>
                Adding… <LoadingDots />
              </>
            ) : (
              "Add presenter"
            )}
          </button>
        </form>
        {error ? (
          <p role="alert" className="text-red text-sm font-bold">
            {error}
          </p>
        ) : message ? (
          <p role="status" className="text-green text-sm font-bold">
            {message}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-ink text-lg">Users</h2>
        {users.length === 0 ? (
          <p className="empty">No provisioned users yet.</p>
        ) : (
          <ul className="card divide-ink/10 divide-y-2 divide-dashed overflow-hidden">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-ink truncate font-mono text-sm font-bold">
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
