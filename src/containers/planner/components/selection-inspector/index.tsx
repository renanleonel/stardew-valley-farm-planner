import { RotateCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogItem } from "@/containers/planner/domain/schemas/assets";
import type { Placement } from "@/containers/planner/domain/schemas/plan";

export function SelectionInspector({
  placement,
  item,
  onRemove,
  onVariant,
  onRotate,
  onEnterInterior,
}: {
  placement: Placement;
  item: CatalogItem;
  onRemove: () => void;
  onVariant: (variant: string) => void;
  onRotate: () => void;
  onEnterInterior?: () => void;
}) {
  return (
    <div className="absolute right-3 top-16 w-56 rounded-xl bg-forest-950/95 p-4 text-parchment shadow-xl">
      <h2 className="font-display text-lg font-bold leading-5">{item.name}</h2>
      <div className="mt-2 text-xs text-mist">
        Tile {placement.x}, {placement.y} · {item.footprint.width}×
        {item.footprint.height}
      </div>
      {item.variants && (
        <label className="mt-3 flex flex-col gap-1 text-xs text-mist">
          Appearance
          <select
            aria-label="Appearance"
            value={placement.variant ?? item.variants[0].id}
            onChange={(event) => onVariant(event.target.value)}
            className="h-9 rounded-lg border border-forest-600 bg-forest-900 px-2 text-parchment"
          >
            {item.variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {item.rotatable && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full"
          onClick={onRotate}
          aria-label="Rotate selected item"
        >
          <RotateCw className="size-3.5" /> Rotate · {placement.rotation * 90}°
        </Button>
      )}
      {onEnterInterior && (
        <Button
          variant="selected"
          size="sm"
          className="mt-3 w-full"
          onClick={onEnterInterior}
        >
          Edit interior
        </Button>
      )}
      <Button
        variant="danger"
        size="sm"
        className="mt-3 w-full"
        onClick={onRemove}
      >
        <Trash2 className="size-3.5" /> Remove
      </Button>
    </div>
  );
}
