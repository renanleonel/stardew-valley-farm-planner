import { FarmBackground } from '@/containers/farm-background';
import { useState } from 'react';
import { Grid } from './containers/grid';

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

  const handleImageLoad = ({
    width,
    height,
    cols,
    rows,
  }: {
    width: number;
    height: number;
    cols: number;
    rows: number;
  }) => {
    setGridSize({ rows, cols });
    setGrid(createEmptyGrid(rows, cols));
    setBoardDimensions({ width, height });
  };

  return (
    <div className='flex min-h-screen bg-slate-900 text-slate-100'>
      <main className='flex flex-1 flex-col overflow-hidden'>
        <FarmBackground layoutConfig={layoutConfig} onImageLoad={handleImageLoad} />
        <section className='flex flex-1 overflow-auto px-6 py-6'>
          <div className='relative w-full flex justify-center '>
            <Grid
              grid={grid}
              gridSize={gridSize}
              background={FARM_BACKGROUND}
              dimensions={boardDimensions}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
