/**
 * Shared Canonical Date & Time Formatter for SAHAAYAA AI
 * 
 * Ensures 100% consistency across all dashboards (Help Reports, Admin, NGO, Volunteer, Donor, LiveMap).
 * Converts backend UTC timestamps (`created_at`, `updated_at`) into Asia/Kolkata (IST) time.
 */

export interface FormatOptions {
  /** If true, returns a short format e.g. "10:32 AM IST" */
  compact?: boolean;
  /** If true, includes relative time e.g. "5 min ago (24 Sep 2026, 10:32 AM IST)" */
  showRelative?: boolean;
  /** If true, appends "IST" zone label (default true) */
  includeZone?: boolean;
}

export const formatReportDateTime = (
  timestamp: string | number | Date | null | undefined,
  options: FormatOptions = {}
): string => {
  if (!timestamp) return 'Reported time unavailable';

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Reported time unavailable';

    const { compact = false, showRelative = false, includeZone = true } = options;

    if (compact) {
      const timeFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const formattedTime = timeFormatter.format(date).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
      return includeZone ? `${formattedTime} IST` : formattedTime;
    }

    const fullFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const rawString = fullFormatter.format(date);
    const uppercaseString = rawString.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
    const finalISTString = includeZone ? `${uppercaseString} IST` : uppercaseString;

    if (showRelative) {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let relative = '';
      if (diffMins < 1) relative = 'Just now';
      else if (diffMins < 60) relative = `${diffMins} min ago`;
      else if (diffHours < 24) relative = `${diffHours} hr ago`;
      else if (diffDays === 1) relative = 'Yesterday';
      else relative = `${diffDays} days ago`;

      return `${relative} (${finalISTString})`;
    }

    return finalISTString;
  } catch (err) {
    console.error('Date formatting error:', err);
    return 'Reported time unavailable';
  }
};

export default formatReportDateTime;
