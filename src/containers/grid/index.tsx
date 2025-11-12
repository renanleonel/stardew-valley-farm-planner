type GridState = (string | null)[][];

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
};

export const Grid = ({ dimensions, gridSize, grid, background }: GridProps) => {
  return (
    <div
      className='grid overflow-visible'
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
          <div key={`${rowIndex}-${colIndex}`} className='border border-gray-700/10' />
        ))
      )}
    </div>
  );
};
