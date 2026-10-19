/** Shared fallback for pages whose personalized content streams in. */
export function PageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12" aria-busy="true">
      <div className="mb-8 flex flex-col gap-2">
        <span className="bg-ink/10 h-7 w-40 animate-pulse rounded-md" />
        <span className="bg-ink/10 h-4 w-64 max-w-full animate-pulse rounded" />
      </div>
      <div className="flex flex-col gap-3">
        <span className="bg-ink/10 h-20 w-full animate-pulse rounded-[10px]" />
        <span className="bg-ink/10 h-20 w-full animate-pulse rounded-[10px]" />
        <span className="bg-ink/10 h-20 w-full animate-pulse rounded-[10px]" />
      </div>
    </main>
  );
}
