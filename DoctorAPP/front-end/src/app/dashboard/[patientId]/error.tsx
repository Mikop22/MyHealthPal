"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center max-w-lg">
        <h2 className="text-[24px] font-medium text-[var(--text-primary)]">Dashboard Error</h2>
        <p className="text-[14px] text-[var(--text-muted)] break-all">
          {error.message}
        </p>
        {error.digest && (
          <p className="text-[12px] text-[var(--text-muted)]">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="glass-purple rounded-[20px] px-6 py-2 text-white text-[14px] font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
