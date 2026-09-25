import type { MapId, Season } from "@/containers/planner/domain/enums/planner";

export const REPORT_ISSUE_EMAIL = "renanleonelpro@gmail.com";

export type ReportIssueContext = {
  map: MapId;
  season: Season;
  location: string;
  pageUrl: string;
};

export type ReportIssueDetails = {
  summary: string;
  description: string;
};

export function reportIssueDraft(
  context: ReportIssueContext,
  details: ReportIssueDetails,
) {
  const summary = details.summary.trim();
  const subject = `Stardew Farm Planner issue${summary ? `: ${summary}` : ""}`;
  const body = [
    "Hi, I found an issue in Stardew Farm Planner.",
    "",
    "What happened:",
    details.description.trim() ||
      "[Describe the issue and how to reproduce it]",
    "",
    "Context:",
    `Map: ${context.map}`,
    `Season: ${context.season}`,
    `Location: ${context.location}`,
    `Page: ${context.pageUrl}`,
  ].join("\n");

  return { subject, body };
}

export function reportIssueHref(
  context: ReportIssueContext,
  details: ReportIssueDetails,
) {
  const { subject, body } = reportIssueDraft(context, details);
  return `mailto:${REPORT_ISSUE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function reportIssueGmailHref(
  context: ReportIssueContext,
  details: ReportIssueDetails,
) {
  const { subject, body } = reportIssueDraft(context, details);
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: REPORT_ISSUE_EMAIL,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
