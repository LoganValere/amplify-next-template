"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BurndownPoint } from "./types";

export function BurndownChart({ points, description }: { points: BurndownPoint[]; description: string }) {
  return (
    <div className="h-72 w-full" role="img" aria-label={description}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={36} />
          <YAxis tick={{ fontSize: 11 }} width={48} unit="h" />
          <Tooltip
            formatter={(value: number) => [`${Number(value).toFixed(2)}h`, "Remaining"]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line
            type="linear"
            dataKey="remaining"
            name="Remaining"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
