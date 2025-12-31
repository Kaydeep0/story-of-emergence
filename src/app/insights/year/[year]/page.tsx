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
        <h1 className="text-2xl font-light mb-2">Year {year}</h1>
        <p className="text-white/60 mb-12">
          A chapter of lived experience.
        </p>

        {/* Placeholder sections - semantic promises, not implementations */}
        <div className="space-y-12">
          {/* Themes */}
          <section>
            <h2 className="text-lg font-light mb-2">Themes</h2>
            <p className="text-sm text-white/40">
              What persisted.
            </p>
          </section>

          {/* Transitions */}
          <section>
            <h2 className="text-lg font-light mb-2">Transitions</h2>
            <p className="text-sm text-white/40">
              What changed.
            </p>
          </section>

          {/* Anchors */}
          <section>
            <h2 className="text-lg font-light mb-2">Anchors</h2>
            <p className="text-sm text-white/40">
              What mattered.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

