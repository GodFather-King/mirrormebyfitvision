// Formats the time remaining until a future date as a human countdown.
// Examples: "2d 5h", "5h 12m", "12m"
export const formatTimeUntil = (target: Date, now: Date = new Date()): string => {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return 'now';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const formatResetDate = (target: Date): string => {
  // e.g. "Mon, 22 Apr · 00:00"
  return target.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};
