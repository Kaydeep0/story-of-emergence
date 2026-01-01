/**
 * Insights Layout
 * 
 * Provides a fixed dark background for all Insights routes.
 * Ensures no white background leaks through even if parent layout is white.
 */

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full text-white">
      {/* Fixed background layer to guarantee no white leaks */}
      <div className="fixed inset-0 bg-black -z-10" />
      {/* Content wrapper */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

