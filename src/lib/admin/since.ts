// "The last 24 hours" for the admin counters, as an ISO time.
export const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
