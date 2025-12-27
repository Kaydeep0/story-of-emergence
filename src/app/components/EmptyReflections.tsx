'use client';

export default function EmptyReflections(props: { onLoadClick: () => void }) {
  return (
    <div className="rounded-xl border border-white/10 p-6 text-center">
      <p className="text-white/70 mb-3">Nothing here yet.</p>
      <button
        onClick={props.onLoadClick}
        className="rounded-2xl bg-white text-black px-4 py-2 hover:bg-white/90"
      >
        Load my reflections
      </button>
    </div>
  );
}
