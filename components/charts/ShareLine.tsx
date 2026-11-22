"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ShareLine({ data }: { data: { date: string; share: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 18, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="shareFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2F6FEB" stopOpacity={0.25} /><stop offset="1" stopColor="#2F6FEB" stopOpacity={0.03} /></linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#EAECF0" />
        <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: "#D0D5DD" }} fontSize={11} interval={0} />
        <YAxis domain={[30, 70]} ticks={[30, 40, 50, 60, 70]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} fontSize={11} />
        <Tooltip formatter={(v) => [`${v}%`, "Buying guides share"]} />
        <Area isAnimationActive={false} type="monotone" dataKey="share" stroke="#2F6FEB" strokeWidth={2} fill="url(#shareFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
