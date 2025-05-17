// Generic skeleton loader for table — shows N animated rows
export default function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton skeleton-avatar" />
          {Array.from({ length: cols - 1 }).map((_, j) => (
            <div
              key={j}
              className="skeleton skeleton-cell"
              style={{ flex: j === 0 ? 2 : 1 }}
            />
          ))}
        </div>
      ))}
    </>
  );
}
