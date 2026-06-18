import { Nav } from "@/components/Nav";
import { PredictionGrid } from "@/components/PredictionGrid";
import { SportTabs } from "@/components/SportTabs";
import { getFavoriteMatchIds, getPredictions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PastPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport = "" } = await searchParams;
  const [predictions, favoriteIds] = await Promise.all([
    getPredictions("past", sport || undefined),
    getFavoriteMatchIds(),
  ]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Past predictions</h1>
          <p className="mt-1 text-neutral-400">
            Every pick we&apos;ve published for events that have already happened — kept on the
            record, most recent first.
          </p>
        </header>

        <SportTabs basePath="/past" active={sport} />

        <PredictionGrid
          predictions={predictions}
          favoriteIds={favoriteIds}
          empty={<p className="text-neutral-300">No past predictions in this category yet.</p>}
        />
      </main>
    </div>
  );
}
