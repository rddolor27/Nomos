// The built app under vite preview, on IPv4 as the harness is: Firefox sometimes fails to reach a ::1-only server.
// NOMOS_WEB points the specs at another preview, such as one serving a build outside apps/web/dist.
export const WEB = process.env.NOMOS_WEB ?? 'http://127.0.0.1:4173';
