import { expect, it } from "vitest";
import { MapId, Season } from "@/containers/planner/domain/enums/planner";
import {
  REPORT_ISSUE_EMAIL,
  reportIssueDraft,
  reportIssueGmailHref,
  reportIssueHref,
} from "@/containers/planner/lib/report-issue";

it("prepares the same addressed report for Gmail and email apps", () => {
  const context = {
    map: MapId.FOREST,
    season: Season.FALL,
    location: "Coop interior",
    pageUrl: "https://example.com/planner",
  };
  const details = {
    summary: " Fence disappeared ",
    description: "Placing a fence next to the gate hides it.",
  };
  const draft = reportIssueDraft(context, details);
  const gmail = new URL(reportIssueGmailHref(context, details));
  const emailApp = reportIssueHref(context, details);

  expect(draft.subject).toContain("Fence disappeared");
  expect(draft.body).toContain(details.description);
  expect(draft.body).toContain("Map: forest");
  expect(draft.body).toContain("Season: fall");
  expect(draft.body).toContain("Location: Coop interior");
  expect(draft.body).toContain(context.pageUrl);
  expect(gmail.hostname).toBe("mail.google.com");
  expect(gmail.searchParams.get("to")).toBe(REPORT_ISSUE_EMAIL);
  expect(gmail.searchParams.get("su")).toBe(draft.subject);
  expect(gmail.searchParams.get("body")).toBe(draft.body);
  expect(emailApp).toContain(`mailto:${REPORT_ISSUE_EMAIL}`);
  expect(new URL(emailApp).searchParams.get("body")).toBe(draft.body);
});
