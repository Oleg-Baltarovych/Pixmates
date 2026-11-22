// The three renderer windows (SPEC §3.1). IPC contracts list which roles may use a channel.
export const WINDOW_ROLES = ['stage', 'chat', 'settings'] as const;
export type WindowRole = (typeof WINDOW_ROLES)[number];
