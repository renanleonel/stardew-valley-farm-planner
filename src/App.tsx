import { useState, type SyntheticEvent } from 'react';

type GridState = (string | null)[][];

const DEFAULT_GRID_ROWS = 30;
const DEFAULT_GRID_COLS = 40;
const layoutConfig = {
  background: '/img/layouts/full_background.jpg',
  tileSize: 16,
};

const BASE_TILE_SIZE = layoutConfig.tileSize;
const FARM_BACKGROUND = layoutConfig.background;

const createEmptyGrid = (rows: number, cols: number): GridState =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

function App() {
  const [gridSize, setGridSize] = useState<{ rows: number; cols: number }>({
    rows: DEFAULT_GRID_ROWS,
    cols: DEFAULT_GRID_COLS,
  });

  const [boardDimensions, setBoardDimensions] = useState<{ width: number; height: number }>({
    width: DEFAULT_GRID_COLS * BASE_TILE_SIZE,
    height: DEFAULT_GRID_ROWS * BASE_TILE_SIZE,
  });

  const [grid, setGrid] = useState<GridState>(() =>
    createEmptyGrid(DEFAULT_GRID_ROWS, DEFAULT_GRID_COLS)
  );

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;

    const cols = Math.round(img.naturalWidth / BASE_TILE_SIZE);
    const rows = Math.round(img.naturalHeight / BASE_TILE_SIZE);

    if (!Number.isFinite(cols) || !Number.isFinite(rows)) return;

    if (cols <= 0 || rows <= 0) return;

    setGridSize({ rows, cols });
    setGrid(createEmptyGrid(rows, cols));
    setBoardDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  return (
    <div className='flex min-h-screen bg-slate-900 text-slate-100'>
      <main className='flex flex-1 flex-col overflow-hidden'>
        <img src={FARM_BACKGROUND} onLoad={handleImageLoad} className='hidden' aria-hidden='true' />
        <section className='flex flex-1 overflow-auto px-6 py-6'>
          <div className='relative w-full flex justify-center '>
            <div
              className='grid overflow-visible'
              style={{
                width: `${boardDimensions.width}px`,
                height: `${boardDimensions.height}px`,
                gridTemplateColumns: `repeat(${gridSize.cols}, minmax(0, 1fr))`,
                backgroundImage: `url(${FARM_BACKGROUND})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'top left',
              }}>
              {grid.map((row, rowIndex) =>
                row.map((_, colIndex) => (
                  <div key={`${rowIndex}-${colIndex}`} className='border border-gray-700/10' />
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
