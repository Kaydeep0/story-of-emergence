'use client';

export default function EmptyReflections(props: { onLoadClick: () => void }) {
  return (
    <div className="rounded-2xl border border-white/10 p-6 text-center space-y-3">
      <p className="text-white/70">
        Nothing here yet. Write your first private reflection, or load existing ones.
      </p>
      <button
        onClick={props.onLoadClick}
        className="rounded-2xl border border-white/20 px-4 py-2 hover:bg-white/5"
      >
        Load my reflections
      </button>
    </div>
  );
}
