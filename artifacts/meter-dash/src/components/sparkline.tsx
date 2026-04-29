import React from "react";
import { Line, LineChart, ResponsiveContainer, YAxis, XAxis } from "recharts";
import type { MeterPayload } from "@workspace/api-client-react";

interface SparklineProps {
  data: MeterPayload[];
  dataKey: string;
  color?: string;
  height?: number;
}

export function Sparkline({ data, dataKey, color = "hsl(var(--chart-1))", height = 40 }: SparklineProps) {
  // data is newest first, we want oldest first for left-to-right chart
  const chartData = React.useMemo(() => {
    return [...data].reverse().map(d => {
      const val = d.data[dataKey];
      return {
        value: typeof val === 'string' ? parseFloat(val) : val
      };
    });
  }, [data, dataKey]);

  if (!chartData || chartData.length === 0) {
    return <div style={{ height }} className="flex items-center justify-center text-xs text-muted-foreground">No data</div>;
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={['auto', 'auto']} hide />
          <XAxis dataKey="name" hide />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={1.5} 
            dot={false} 
            isAnimationActive={false} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
