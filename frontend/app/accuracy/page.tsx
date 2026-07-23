import { AppShell } from "@/components/AppShell";
import { CalibrationChart } from "@/components/CalibrationChart";
import accuracy from "@/lib/accuracy.json";

export default function AccuracyPage() {
  const gap = accuracy.model.brier - accuracy.market.brier;

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}>Track record</h1>
          <p className="mt-2 max-w-2xl text-[#5a607a]">
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

        <p className="mb-10 rounded-2xl border border-[#1e2236] bg-[#0c0f1a] p-4 text-sm text-[#5a607a]">
          The market&apos;s closing line is the gold standard — it&apos;s extremely hard to beat. Our
          model&apos;s Brier sits just{" "}
          <span className="font-semibold text-[#e4e7f0]">{gap.toFixed(3)}</span> behind it, on
          self-computed point-in-time features with zero odds leakage.
        </p>

        <section>
          <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-[#3a3e55]">
            Calibration
          </h2>
          <p className="mb-4 text-sm text-[#5a607a]">
            When the model says 70%, does it happen ~70% of the time? Points on the dashed line are
            perfectly calibrated.
          </p>
          <div className="rounded-2xl border border-[#1e2236] bg-[#0c0f1a] p-5">
            <CalibrationChart calibration={accuracy.calibration} />
          </div>
        </section>

        <p className="mt-8 text-xs text-[#3a3e55]">
          {accuracy.model_type} model · {accuracy.n_features} self-computed features · time-based
          train/test split · market = de-vigged closing moneyline (n={accuracy.market.n}).
        </p>
      </main>
    </AppShell>
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
    <div className="rounded-2xl border border-[#1e2236] bg-[#0c0f1a] p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-[#e4e7f0]">{title}</h3>
        <span className="text-xs text-[#3a3e55]">{subtitle}</span>
      </div>
      <div className="mt-4 flex items-end gap-6">
        <div>
          <p className="text-3xl font-bold text-emerald-400">{model.toFixed(3)}</p>
          <p className="text-xs text-[#5a607a]">our model</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-[#b0b8d0]">{market.toFixed(3)}</p>
          <p className="text-xs text-[#5a607a]">market</p>
        </div>
      </div>
    </div>
  );
}
