import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { APP_ROLES } from "@/lib/roles";

// Mirrors supabase/migrations/0001_talk_platform.sql. The migration is the
// source of truth for constraints and triggers (the database is never
// generated from this file); keep both in sync.

export const appRole = pgEnum("app_role", [...APP_ROLES]);

// Mirror of auth.users; role is app-owned and verification mirrors Auth.
export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").primaryKey(),
    email: text("email"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    role: appRole("role").notNull().default("attendee"),
  },
  (table) => [
    uniqueIndex("app_users_email_unique")
      .on(table.email)
      .where(sql`email IS NOT NULL`),
  ],
);

export const talks = pgTable("talks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  heldAt: timestamp("held_at", { withTimezone: true }),
  slidesUpdatedAt: timestamp("slides_updated_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  isPublic: boolean("is_public").notNull().default(false),
  anonymousJoinOpen: boolean("anonymous_join_open").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Anonymous attendee identity scoped to one talk. The browser holds the
 * plaintext token in an HttpOnly cookie; only its hash is stored here.
 */
export const talkGuests = pgTable(
  "talk_guests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    talkId: uuid("talk_id")
      .notNull()
      .references(() => talks.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    usernameNormalized: text("username_normalized").notNull(),
    tokenHash: text("token_hash").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("talk_guests_talk_username_unique").on(
      table.talkId,
      table.usernameNormalized,
    ),
    index("talk_guests_talk_idx").on(table.talkId),
  ],
);

export const talkRoster = pgTable(
  "talk_roster",
  {
    talkId: uuid("talk_id")
      .notNull()
      .references(() => talks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.talkId, table.userId] }),
    index("talk_roster_user_id_idx").on(table.userId),
  ],
);

/**
 * Shared activity lifecycle. `type` names the activity module that owns the
 * type-specific data; polls were the first module. One activity may be
 * active per talk at a time.
 */
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    talkId: uuid("talk_id")
      .notNull()
      .references(() => talks.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("poll"),
    status: text("status").notNull().default("draft"),
    launchedAt: timestamp("launched_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("activities_one_active_per_talk")
      .on(table.talkId)
      .where(sql`status = 'active'`),
    index("activities_talk_id_idx").on(table.talkId),
  ],
);

export const polls = pgTable("polls", {
  activityId: uuid("activity_id")
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  resultsIdentifiable: boolean("results_identifiable").notNull().default(false),
});

export const pollOptions = pgTable("poll_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id")
    .notNull()
    .references(() => polls.activityId, { onDelete: "cascade" }),
  label: text("label").notNull(),
  position: integer("position").notNull().default(0),
});

// One immutable vote per attendee per poll (primary key). user_id's foreign
// key to auth.users exists in the migration; it is omitted here because the
// auth schema is not part of this app mapping. Voter emails are resolved from
// app_users by user_id rather than stored on the vote.
export const pollVotes = pgTable(
  "poll_votes",
  {
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.activityId, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    guestId: uuid("guest_id").references(() => talkGuests.id, {
      onDelete: "cascade",
    }),
    voterKey: uuid("voter_key").generatedAlwaysAs(
      sql`coalesce(user_id, guest_id)`,
    ),
    optionId: uuid("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.pollId, table.voterKey] })],
);

// Pre-aggregated counts maintained by a trigger in the migration.
export const pollVoteCounts = pgTable(
  "poll_vote_counts",
  {
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.activityId, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    votes: bigint("votes", { mode: "number" }).notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.pollId, table.optionId] })],
);

/**
 * Quiz activity module. Like a poll, but exactly one option is correct and the
 * answer is only revealed once the activity is closed. The app enforces
 * exactly one correct option; the partial unique index enforces at most one.
 */
export const quizzes = pgTable("quizzes", {
  activityId: uuid("activity_id")
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  resultsIdentifiable: boolean("results_identifiable").notNull().default(false),
});

export const quizOptions = pgTable(
  "quiz_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.activityId, { onDelete: "cascade" }),
    label: text("label").notNull(),
    position: integer("position").notNull().default(0),
    isCorrect: boolean("is_correct").notNull().default(false),
  },
  (table) => [
    uniqueIndex("quiz_options_one_correct")
      .on(table.quizId)
      .where(sql`is_correct`),
  ],
);

// One immutable vote per attendee per quiz (primary key). user_id's foreign
// key to auth.users exists in the migration; it is omitted here because the
// auth schema is not part of this app mapping. Voter emails are resolved from
// app_users by user_id rather than stored on the vote.
export const quizVotes = pgTable(
  "quiz_votes",
  {
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.activityId, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    guestId: uuid("guest_id").references(() => talkGuests.id, {
      onDelete: "cascade",
    }),
    voterKey: uuid("voter_key").generatedAlwaysAs(
      sql`coalesce(user_id, guest_id)`,
    ),
    optionId: uuid("option_id")
      .notNull()
      .references(() => quizOptions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.quizId, table.voterKey] })],
);

// Pre-aggregated counts maintained by a trigger in the migration.
export const quizVoteCounts = pgTable(
  "quiz_vote_counts",
  {
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.activityId, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => quizOptions.id, { onDelete: "cascade" }),
    votes: bigint("votes", { mode: "number" }).notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.quizId, table.optionId] })],
);

/**
 * Free-text activity module. Attendees submit one immutable answer while the
 * activity is active; a ranking run stores the model's scores and the published
 * result. The migration owns the lifecycle and immutability guards.
 */
export const textActivities = pgTable("text_activities", {
  activityId: uuid("activity_id")
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  criteria: text("criteria").notNull(),
  resultsIdentifiable: boolean("results_identifiable").notNull().default(false),
});

// user_id is nullable only for GDPR deletion; the write guard forces the body
// to "[answer removed]". The auth-schema FK lives in the migration.
export const textAnswers = pgTable(
  "text_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => textActivities.activityId, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    guestId: uuid("guest_id").references(() => talkGuests.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("text_answers_activity_user_unique").on(
      table.activityId,
      table.userId,
    ),
    uniqueIndex("text_answers_activity_guest_unique")
      .on(table.activityId, table.guestId)
      .where(sql`guest_id IS NOT NULL`),
    index("text_answers_activity_idx").on(
      table.activityId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const textRankingRuns = pgTable(
  "text_ranking_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => textActivities.activityId, { onDelete: "cascade" }),
    status: text("status").notNull().default("running"),
    model: text("model"),
    promptVersion: text("prompt_version").notNull(),
    criteriaSnapshot: text("criteria_snapshot").notNull(),
    answerCount: integer("answer_count").notNull(),
    error: text("error"),
    summary: text("summary"),
    generationId: text("generation_id"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("text_ranking_runs_one_running")
      .on(table.activityId)
      .where(sql`status = 'running'`),
    uniqueIndex("text_ranking_runs_one_published")
      .on(table.activityId)
      .where(sql`published_at IS NOT NULL`),
  ],
);

export const textRankings = pgTable(
  "text_rankings",
  {
    runId: uuid("run_id")
      .notNull()
      .references(() => textRankingRuns.id, { onDelete: "cascade" }),
    answerId: uuid("answer_id")
      .notNull()
      .references(() => textAnswers.id, { onDelete: "cascade" }),
    rank: integer("rank"),
    score: integer("score"),
    rationale: text("rationale"),
    dropReason: text("drop_reason"),
  },
  (table) => [
    primaryKey({ columns: [table.runId, table.answerId] }),
    uniqueIndex("text_rankings_one_per_rank")
      .on(table.runId, table.rank)
      .where(sql`rank IS NOT NULL`),
  ],
);

export type TalkRow = typeof talks.$inferSelect;
export type TalkGuestRow = typeof talkGuests.$inferSelect;
export type TalkRosterRow = typeof talkRoster.$inferSelect;
export type ActivityRow = typeof activities.$inferSelect;
export type PollRow = typeof polls.$inferSelect;
export type PollOptionRow = typeof pollOptions.$inferSelect;
export type PollVoteRow = typeof pollVotes.$inferSelect;
export type PollVoteCountRow = typeof pollVoteCounts.$inferSelect;
export type QuizRow = typeof quizzes.$inferSelect;
export type QuizOptionRow = typeof quizOptions.$inferSelect;
export type QuizVoteRow = typeof quizVotes.$inferSelect;
export type QuizVoteCountRow = typeof quizVoteCounts.$inferSelect;
export type TextActivityRow = typeof textActivities.$inferSelect;
export type TextAnswerRow = typeof textAnswers.$inferSelect;
export type TextRankingRunRow = typeof textRankingRuns.$inferSelect;
export type TextRankingRow = typeof textRankings.$inferSelect;
export type AppUserRow = typeof appUsers.$inferSelect;
