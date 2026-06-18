import { CalibrationChart } from "@/components/CalibrationChart";
import { Nav } from "@/components/Nav";
import accuracy from "@/lib/accuracy.json";

export default function AccuracyPage() {
  const gap = accuracy.model.brier - accuracy.market.brier;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Track record</h1>
          <p className="mt-2 max-w-2xl text-neutral-400">
            We don&apos;t claim to beat Vegas. We measure exactly how close the model gets to the
            de-vigged closing line, and show our calibration honestly. Scored on{" "}
            {accuracy.test_n.toLocaleString()} held-out UFC fights ({accuracy.test_window[0]} →{" "}
            {accuracy.test_window[1]}) the model never trained on.
          </p>
        </header>

        <section className="mb-10 grid gap-4 sm:grid-cols-2">
          <MetricCard
            title="Brier score"
            subtitle="lower is better"
            model={accuracy.model.brier}
            market={accuracy.market.brier}
          />
          <MetricCard
            title="Log loss"
            subtitle="lower is better"
            model={accuracy.model.log_loss}
            market={accuracy.market.log_loss}
          />
        </section>

        <p className="mb-10 rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          The market&apos;s closing line is the gold standard — it&apos;s extremely hard to beat. Our
          model&apos;s Brier sits just{" "}
          <span className="font-semibold text-neutral-200">{gap.toFixed(3)}</span> behind it, on
          self-computed point-in-time features with zero odds leakage.
        </p>

        <section>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Calibration
          </h2>
          <p className="mb-4 text-sm text-neutral-500">
            When the model says 70%, does it happen ~70% of the time? Points on the dashed line are
            perfectly calibrated.
          </p>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <CalibrationChart calibration={accuracy.calibration} />
          </div>
        </section>

        <p className="mt-8 text-xs text-neutral-600">
          {accuracy.model_type} model · {accuracy.n_features} self-computed features · time-based
          train/test split · market = de-vigged closing moneyline (n={accuracy.market.n}).
        </p>
      </main>
    </div>
  );
}

function MetricCard({
  title,
  subtitle,
  model,
  market,
}: {
  title: string;
  subtitle: string;
  model: number;
  market: number;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-neutral-500">{subtitle}</span>
      </div>
      <div className="mt-4 flex items-end gap-6">
        <div>
          <p className="text-3xl font-bold text-emerald-400">{model.toFixed(3)}</p>
          <p className="text-xs text-neutral-500">our model</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-neutral-300">{market.toFixed(3)}</p>
          <p className="text-xs text-neutral-500">market</p>
        </div>
      </div>
    </div>
  );
}
