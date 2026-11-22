"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const TICK = { fontSize: 11, fill: "#667085" };

export function ShareLine({ data }: { data: { date: string; share: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#EAECF0" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={{ stroke: "#D0D5DD" }}
          tick={TICK}
          tickMargin={8}
          interval={0}
          tickFormatter={(d: string, i: number) => (i === 0 ? d : d.split(" ")[0])}
        />
        <YAxis domain={[30, 70]} ticks={[30, 40, 50, 60, 70]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={TICK} />
        <Tooltip
          formatter={(v) => [`${v}%`, "Buying guides share"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #E3E8EF", fontSize: 13, boxShadow: "0 8px 24px rgba(16,24,40,.08)" }}
          cursor={{ stroke: "#D0D5DD" }}
        />
        <Area
          isAnimationActive={false}
          type="monotone"
          dataKey="share"
          stroke="#2F6FEB"
          strokeWidth={2}
          fill="#2F6FEB"
          fillOpacity={0.06}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
