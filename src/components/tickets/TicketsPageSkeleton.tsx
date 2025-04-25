export function TicketsPageSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {Array(4).fill(0).map((_, colIndex) => (
        <div key={colIndex} className="bg-card rounded-lg p-4 space-y-4 border border-border">
          <div className="h-6 w-24 bg-muted animate-pulse rounded" />
          {Array(colIndex === 0 ? 3 : colIndex === 1 ? 4 : colIndex === 2 ? 2 : 1)
            .fill(0)
            .map((_, cardIndex) => (
              <div key={cardIndex} className="bg-background rounded-md p-4 border border-border space-y-3">
                <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                <div className="flex justify-between items-center">
                  <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
                  <div className="h-4 bg-muted animate-pulse rounded w-16" />
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
