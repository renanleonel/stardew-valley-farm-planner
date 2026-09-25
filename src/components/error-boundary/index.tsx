import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StorageKey } from "@/containers/planner/domain/enums/planner";
import { InvalidSavedPlanError } from "@/containers/planner/domain/repositories/plan";

function downloadSavedPlan() {
  const raw = localStorage.getItem(StorageKey.PLANNER);
  if (!raw) return;
  const url = URL.createObjectURL(
    new Blob([raw], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "stardew-farm-plans-recovery.json";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error?: Error }
> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Planner failed to load", error, info);
  }

  render() {
    if (this.state.error)
      return (
        <div className="grid min-h-dvh place-items-center bg-forest-950 p-6 text-parchment">
          <div className="max-w-md rounded-2xl border border-forest-600 bg-forest-900 p-6 shadow-2xl">
            <h1 className="text-xl font-bold">The planner could not load</h1>
            <p className="mt-2 text-sm leading-6 text-mist">
              {this.state.error.message}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {this.state.error instanceof InvalidSavedPlanError && (
                <>
                  <Button variant="secondary" onClick={downloadSavedPlan}>
                    Download saved data
                  </Button>
                  <Button
                    onClick={() => {
                      localStorage.removeItem(StorageKey.PLANNER);
                      window.location.reload();
                    }}
                  >
                    Reset local plans
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={() => window.location.reload()}>
                Reload planner
              </Button>
            </div>
          </div>
        </div>
      );
    return this.props.children;
  }
}
