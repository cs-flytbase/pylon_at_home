export function TicketsPageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="h-8 w-32 bg-muted rounded mb-2"></div>
          <div className="h-5 w-64 bg-muted rounded"></div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="h-9 w-48 bg-muted rounded"></div>
          <div className="h-9 w-28 bg-muted rounded"></div>
        </div>
      </div>
      
      {/* Kanban board skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((column) => (
          <div key={column} className="bg-card rounded-lg p-4 space-y-4 border border-border">
            <div className="flex justify-between items-center mb-2">
              <div className="h-6 w-24 bg-muted rounded"></div>
              <div className="h-5 w-6 bg-muted rounded"></div>
            </div>
            
            {Array(column === 1 ? 3 : column === 2 ? 4 : column === 3 ? 2 : 1)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="bg-background rounded-md p-4 border border-border space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4"></div>
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-muted rounded"></div>
                    <div className="h-5 w-16 bg-muted rounded"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-24 bg-muted rounded"></div>
                    <div className="h-4 w-16 bg-muted rounded"></div>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
