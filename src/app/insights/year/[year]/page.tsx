'use client';

/**
 * Year - Yearly Narrative Frame Scaffolding
 * 
 * Read-only container for a single year's narrative.
 * No computation, no insight generation, just structure.
 * 
 * This is a chapter title, not the chapter.
 */

interface YearPageProps {
  params: {
    year: string;
  };
}

export default function YearPage({ params }: YearPageProps) {
  const year = params.year;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Year Header Block */}
        <div className="mb-12">
          <h1 className="text-2xl font-light mb-2">Year {year}</h1>
          <p className="text-white/60 mb-2">
            A chapter of lived experience.
          </p>
          <p className="text-sm text-white/40">
            This view reflects patterns only visible in hindsight.
          </p>
        </div>

        {/* Locked Narrative Sections */}
        <div className="space-y-12">
          {/* Themes */}
          <section>
            <h2 className="text-lg font-light mb-2">Themes</h2>
            <p className="text-sm text-white/40 mb-4">
              What persisted across the year.
            </p>
            <p className="text-sm text-white/30 italic">
              No narrative generated yet.
            </p>
          </section>

          {/* Transitions */}
          <section>
            <h2 className="text-lg font-light mb-2">Transitions</h2>
            <p className="text-sm text-white/40 mb-4">
              What changed direction.
            </p>
            <p className="text-sm text-white/30 italic">
              No narrative generated yet.
            </p>
          </section>

          {/* Anchors */}
          <section>
            <h2 className="text-lg font-light mb-2">Anchors</h2>
            <p className="text-sm text-white/40 mb-4">
              What mattered enough to remain.
            </p>
            <p className="text-sm text-white/30 italic">
              No narrative generated yet.
            </p>
          </section>
        </div>

        {/* Read Only Guardrail */}
        <div className="mt-16 pt-8 border-t border-white/5">
          <p className="text-xs text-white/30 italic">
            This narrative is constructed from reflection history.
            It cannot be edited directly.
          </p>
        </div>
      </div>
    </div>
  );
}

