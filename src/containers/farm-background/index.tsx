import type { SyntheticEvent } from 'react';

type FarmBackgroundProps = {
  layoutConfig: {
    background: string;
    tileSize: number;
  };
  onImageLoad: (dimensions: { width: number; height: number; cols: number; rows: number }) => void;
};

export const FarmBackground = ({ layoutConfig, onImageLoad }: FarmBackgroundProps) => {
  const FARM_BACKGROUND = layoutConfig.background;

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;

    const cols = Math.round(img.naturalWidth / layoutConfig.tileSize);
    const rows = Math.round(img.naturalHeight / layoutConfig.tileSize);

    if (!Number.isFinite(cols) || !Number.isFinite(rows)) return;

    if (cols <= 0 || rows <= 0) return;

    const width = img.naturalWidth;
    const height = img.naturalHeight;

    onImageLoad({ width, height, cols, rows });
  };

  return (
    <img src={FARM_BACKGROUND} onLoad={handleImageLoad} className='hidden' aria-hidden='true' />
  );
};
