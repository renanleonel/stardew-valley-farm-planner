import { FarmBackground } from '@/containers/farm-background';
import farms from '@/lib/data/farms.json';
import { useState } from 'react';
import { Grid } from './containers/grid';

type GridState = (string | null)[][];

const TILE_SIZE = 16;

const createEmptyGrid = (rows: number, cols: number): GridState =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

function App() {
  const farmData = farms.regular;

  const [gridSize, setGridSize] = useState<{ rows: number; cols: number }>({
    rows: 0,
    cols: 0,
  });

  const [boardDimensions, setBoardDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const [grid, setGrid] = useState<GridState>(() => createEmptyGrid(0, 0));

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
    if (farmData && width === farmData.width && height === farmData.height) {
      setGridSize({ rows, cols });
      setGrid(createEmptyGrid(rows, cols));
      setBoardDimensions({ width, height });
    }
  };

  const layoutConfig = {
    background: `/img/layouts/${farmData.backgroundImage}`,
    tileSize: TILE_SIZE,
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
              background={layoutConfig.background}
              dimensions={boardDimensions}
              tileSize={TILE_SIZE}
              buildings={{
                house: farmData.house
                  ? { ...farmData.house, image: '/img/tiles/house.png' }
                  : undefined,
                greenhouse: farmData.greenhouse
                  ? { ...farmData.greenhouse, image: '/img/tiles/greenhouse-broken.png' }
                  : undefined,
              }}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
