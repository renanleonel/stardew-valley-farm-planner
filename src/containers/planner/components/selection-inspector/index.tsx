import { useState } from "react";
import {
  Copy,
  DoorOpen,
  MoreHorizontal,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import type { CatalogItem } from "@/containers/planner/domain/schemas/assets";
import type { Placement } from "@/containers/planner/domain/schemas/plan";

export function SelectionInspector({
  placement,
  item,
  onRemove,
  onVariant,
  onRotate,
  onEnterInterior,
  onDuplicate,
  onClose,
}: {
  placement: Placement;
  item: CatalogItem;
  onRemove: () => void;
  onVariant: (variant: string) => void;
  onRotate: () => void;
  onEnterInterior?: () => void;
  onDuplicate: () => void;
  onClose: () => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(true);
  return (
    <div className="absolute right-3 top-16 z-10 w-56 max-w-[calc(100%-1.5rem)] text-parchment">
      <div className="selection-bar flex h-9 items-center gap-1 rounded-full border border-forest-700 bg-forest-950/95 px-1 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          title="Deselect item"
          aria-label="Deselect item"
          className="grid size-7 shrink-0 place-items-center rounded-full text-mist hover:bg-forest-800 hover:text-parchment focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          <X className="size-3.5" />
        </button>
        <span
          className="min-w-0 flex-1 truncate px-1 text-xs font-semibold"
          title={item.name}
        >
          {item.name}
        </span>
        <button
          type="button"
          onClick={() => setActionsOpen((open) => !open)}
          aria-label="Item actions"
          aria-expanded={actionsOpen}
          aria-controls="selection-actions"
          title="Item actions"
          className={`grid size-7 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-amber-300 ${actionsOpen ? "bg-forest-700 text-parchment" : "text-mist hover:bg-forest-800 hover:text-parchment"}`}
        >
          <MoreHorizontal className="size-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove selected item"
          aria-label="Remove selected item"
          className="grid size-7 shrink-0 place-items-center rounded-full text-rose-300 hover:bg-rose-950/60 focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div
        id="selection-actions"
        data-open={actionsOpen}
        aria-hidden={!actionsOpen}
        inert={!actionsOpen}
        className="selection-actions mt-1.5 overflow-hidden rounded-xl border border-forest-700 bg-forest-950/95 p-1 shadow-xl"
      >
        <button
          type="button"
          onClick={onDuplicate}
          className="selection-action"
        >
          <Copy className="size-4" /> Duplicate
        </button>
        {item.rotatable && (
          <button type="button" onClick={onRotate} className="selection-action">
            <RotateCw className="size-4" /> Rotate{" "}
            <span className="ml-auto text-mist">
              {placement.rotation * 90}°
            </span>
          </button>
        )}
        {onEnterInterior && (
          <button
            type="button"
            onClick={onEnterInterior}
            className="selection-action"
          >
            <DoorOpen className="size-4" /> Edit interior
          </button>
        )}
        {item.variants && (
          <label className="block border-t border-forest-700 px-2 py-2 text-xs text-mist">
            Appearance
            <select
              aria-label="Appearance"
              value={placement.variant ?? item.variants[0].id}
              onChange={(event) => onVariant(event.target.value)}
              className="mt-1.5 h-9 w-full rounded-lg border border-forest-600 bg-forest-900 px-2 text-base text-parchment focus-visible:outline-2 focus-visible:outline-amber-300 sm:text-sm"
            >
              {item.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
