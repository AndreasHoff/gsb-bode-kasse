interface BulkOperationProgressProps {
  completed: number;
  total: number;
  operation: string;
}

export default function BulkOperationProgress({
  completed,
  total,
  operation,
}: BulkOperationProgressProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="app-card app-card--muted p-3" role="status" aria-live="polite">
      <p className="text-sm font-semibold mb-2">{operation}</p>
      <div className="relative h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-primary)] transition-all duration-300"
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mt-2">
        {completed} af {total} ({percentage}%)
      </p>
    </div>
  );
}
