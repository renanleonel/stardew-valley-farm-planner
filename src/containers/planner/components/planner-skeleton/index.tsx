export function PlannerSkeleton() {
  return (
    <div
      className="flex h-dvh min-h-0 bg-forest-950 text-parchment"
      aria-label="Loading farm planner"
    >
      <div className="hidden w-76 shrink-0 border-r border-forest-700 bg-forest-900 p-4 lg:block">
        <div className="h-7 w-36 rounded bg-forest-700" />
        <div className="mt-7 h-10 rounded bg-forest-700" />
        <div className="mt-5 grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-11 rounded bg-forest-700" />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-27 rounded bg-forest-800" />
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 bg-forest-900" />
      <div className="hidden w-68 shrink-0 border-l border-forest-700 bg-forest-900 p-4 lg:block">
        <div className="h-7 w-36 rounded bg-forest-700" />
        <div className="mt-7 space-y-3">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="h-10 rounded bg-forest-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
