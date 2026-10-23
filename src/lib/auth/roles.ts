export const APP_ROLES = ["attendee", "presenter", "admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];
