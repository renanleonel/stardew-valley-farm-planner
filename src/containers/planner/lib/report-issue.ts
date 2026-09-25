import type { MapId, Season } from "@/containers/planner/domain/enums/planner";

export const REPORT_ISSUE_EMAIL = "renanleonelpro@gmail.com";

export function reportIssueHref(
  email: string,
  context: {
    map: MapId;
    season: Season;
    location: string;
    pageUrl: string;
  },
) {
  const subject = "Stardew Farm Planner issue";
  const body = [
    "Hi, I found an issue in Stardew Farm Planner.",
    "",
    "What happened:",
    "",
    "Steps to reproduce:",
    "1. ",
    "",
    "Expected result:",
    "",
    "Context:",
    `Map: ${context.map}`,
    `Season: ${context.season}`,
    `Location: ${context.location}`,
    `Page: ${context.pageUrl}`,
  ].join("\n");

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
