'use client';

export default function ReflectionsSkeleton() {
  return (
    <div className="mt-4 space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/10 p-3">
          <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
          <div className="mt-2 h-4 w-full rounded bg-white/10 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
