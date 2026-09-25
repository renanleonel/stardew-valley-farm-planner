import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Bug, Copy, ExternalLink, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  REPORT_ISSUE_EMAIL,
  reportIssueDraft,
  reportIssueGmailHref,
  reportIssueHref,
} from "@/containers/planner/lib/report-issue";
import type { ReportIssueContext } from "@/containers/planner/lib/report-issue";

export function ReportIssue({ context }: { context: ReportIssueContext }) {
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const details = { summary, description };
  const draft = reportIssueDraft(context, details);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(
        `To: ${REPORT_ISSUE_EMAIL}\nSubject: ${draft.subject}\n\n${draft.body}`,
      );
      setCopyStatus("Report copied");
    } catch {
      setCopyStatus("Could not copy the report. Try an email option instead.");
    }
  };

  return (
    <Dialog.Root onOpenChange={() => setCopyStatus("")}>
      <Dialog.Trigger asChild>
        <Button variant="secondary" className="w-full text-xs">
          <Bug aria-hidden="true" className="size-4" /> Report issue
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-forest-950/80" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-forest-600 bg-forest-900 p-5 text-parchment shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-2xl font-bold">
                Report an issue
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-mist">
                Describe the problem, then open a draft addressed to
                {` ${REPORT_ISSUE_EMAIL}`}. You can review it before sending.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                size="compact"
                variant="ghost"
                aria-label="Close report issue"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">
              Short summary
              <Input
                className="mt-2"
                value={summary}
                maxLength={120}
                placeholder="What went wrong?"
                onChange={(event) => {
                  setSummary(event.target.value);
                  setCopyStatus("");
                }}
              />
            </label>
            <label className="block text-sm font-semibold">
              Details and steps to reproduce
              <textarea
                className="mt-2 min-h-32 w-full resize-y rounded-lg border border-forest-600 bg-forest-950 px-3 py-2 text-sm font-normal text-parchment placeholder:text-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                value={description}
                maxLength={2000}
                placeholder="What happened, and what did you expect?"
                onChange={(event) => {
                  setDescription(event.target.value);
                  setCopyStatus("");
                }}
              />
            </label>
          </div>
          <p className="mt-3 text-xs leading-5 text-mist">
            The draft includes your map, season, location, and page URL. No
            email is sent until you send it from your mail account.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button asChild variant="default" className="text-xs">
              <a
                href={reportIssueGmailHref(context, details)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink aria-hidden="true" className="size-4" /> Open
                Gmail draft
              </a>
            </Button>
            <Button asChild variant="secondary" className="text-xs">
              <a href={reportIssueHref(context, details)}>
                <Mail aria-hidden="true" className="size-4" /> Use email app
              </a>
            </Button>
            <Button
              variant="ghost"
              className="text-xs sm:col-span-2"
              onClick={copyReport}
            >
              <Copy aria-hidden="true" className="size-4" /> Copy report
            </Button>
          </div>
          <p
            role="status"
            className="mt-2 min-h-5 text-center text-xs text-mist"
          >
            {copyStatus}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
