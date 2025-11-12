type GridState = (string | null)[][];

type Building = {
  x: number;
  y: number;
  image: string;
};

type GridProps = {
  dimensions: {
    width: number;
    height: number;
  };
  gridSize: {
    rows: number;
    cols: number;
  };
  grid: GridState;
  background: string;
  tileSize: number;
  buildings?: {
    house?: Building;
    greenhouse?: Building;
  };
};

export const Grid = ({
  dimensions,
  gridSize,
  grid,
  background,
  tileSize,
  buildings,
}: GridProps) => {
  return (
    <div
      className='grid overflow-visible relative'
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        gridTemplateColumns: `repeat(${gridSize.cols}, minmax(0, 1fr))`,
        backgroundImage: `url(${background})`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'top left',
      }}>
      {grid.map((row, rowIndex) =>
        row.map((_, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className='border border-gray-700/10 hover:bg-green-500/50 cursor-pointer'
          />
        ))
      )}

      {buildings?.house && (
        <img
          src={buildings.house.image}
          alt='house'
          className='absolute hover:opacity-50 transition-opacity cursor-pointer'
          style={{
            left: `${buildings.house.x * tileSize}px`,
            top: `${buildings.house.y * tileSize}px`,
          }}
        />
      )}

      {buildings?.greenhouse && (
        <img
          src={buildings.greenhouse.image}
          alt='greenhouse'
          className='absolute hover:opacity-50 transition-opacity cursor-pointer'
          style={{
            left: `${buildings.greenhouse.x * tileSize}px`,
            top: `${buildings.greenhouse.y * tileSize}px`,
          }}
        />
      )}
    </div>
  );
};
