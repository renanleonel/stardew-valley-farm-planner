import { ChevronDown, Download, ImageDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlanFiles({
  onExportPng,
  onExportJson,
  onImportJson,
}: {
  onExportPng: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
}) {
  return (
    <details className="group">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-lg text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 [&::-webkit-details-marker]:hidden">
        Plan files
        <ChevronDown
          aria-hidden="true"
          className="size-4 group-open:rotate-180"
        />
      </summary>
      <div className="mt-2 space-y-2">
        <Button
          variant="secondary"
          onClick={onExportPng}
          className="h-10 w-full justify-start text-xs"
        >
          <ImageDown aria-hidden="true" className="size-4" /> Export farm image
        </Button>
        <Button
          variant="secondary"
          onClick={onExportJson}
          className="h-10 w-full justify-start text-xs"
        >
          <Download aria-hidden="true" className="size-4" /> Export plan JSON
        </Button>
        <Button
          variant="secondary"
          onClick={onImportJson}
          className="h-10 w-full justify-start text-xs"
        >
          <Upload aria-hidden="true" className="size-4" /> Import plan JSON
        </Button>
      </div>
    </details>
  );
}
