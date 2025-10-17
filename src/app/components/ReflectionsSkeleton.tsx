'use client';

export default function ReflectionsSkeleton() {
  return (
    <div className="mt-4 space-y-2">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 p-3 animate-pulse"
        >
          <div className="h-3 w-24 bg-white/10 rounded mb-2" />
          <div className="h-4 w-full bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}
