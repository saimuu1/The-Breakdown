"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Bin {
  p_mean: number;
  frac_pos: number;
  count: number;
}

export function CalibrationChart({ calibration }: { calibration: Bin[] }) {
  const data = calibration.map((b) => ({
    predicted: +(b.p_mean * 100).toFixed(0),
    observed: +(b.frac_pos * 100).toFixed(1),
    perfect: +(b.p_mean * 100).toFixed(0),
    count: b.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
        <XAxis
          dataKey="predicted"
          type="number"
          domain={[0, 100]}
          tick={{ fill: "#737373", fontSize: 12 }}
          stroke="#404040"
          label={{ value: "Predicted win %", position: "bottom", fill: "#737373", fontSize: 12 }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#737373", fontSize: 12 }}
          stroke="#404040"
          label={{
            value: "Observed win %",
            angle: -90,
            position: "insideLeft",
            fill: "#737373",
            fontSize: 12,
          }}
        />
        <Tooltip
          contentStyle={{
            background: "#171717",
            border: "1px solid #404040",
            borderRadius: 8,
            color: "#e5e5e5",
          }}
          formatter={(value, name) => [`${value}%`, name === "observed" ? "Observed" : "Perfect"]}
        />
        <Line
          type="monotone"
          dataKey="perfect"
          stroke="#525252"
          strokeDasharray="5 5"
          dot={false}
          name="perfect"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="observed"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 4, fill: "#10b981" }}
          name="observed"
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
