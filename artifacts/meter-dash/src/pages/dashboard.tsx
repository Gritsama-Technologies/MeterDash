import React, { useEffect, useState } from "react";
import { 
  useGetLatestMeterData, 
  useGetMeterHistory, 
  useGetMeterSummary,
  getGetLatestMeterDataQueryKey,
  getGetMeterHistoryQueryKey,
  getGetMeterSummaryQueryKey
} from "@workspace/api-client-react";
import { formatRelativeTime, formatValue } from "@/lib/formatters";
import { MeterCard, ParameterRow } from "@/components/meter-card";
import { Sparkline } from "@/components/sparkline";
import { TestFramePanel } from "@/components/test-frame-panel";
import { Activity, ActivitySquare, AlertTriangle, CheckCircle2, Zap, Radio, Clock, BoxSelect } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const queryOpts = { 
    refetchInterval: 2000, 
    refetchOnWindowFocus: true 
  };

  const { data: latestData, isLoading: latestLoading } = useGetLatestMeterData({ 
    query: { ...queryOpts, queryKey: getGetLatestMeterDataQueryKey() } 
  });
  
  const { data: historyData } = useGetMeterHistory({ 
    query: { ...queryOpts, queryKey: getGetMeterHistoryQueryKey() } 
  });
  
  const { data: summaryData } = useGetMeterSummary({ 
    query: { ...queryOpts, queryKey: getGetMeterSummaryQueryKey() } 
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const noData = !latestData || !latestData.data;

  if (latestLoading && noData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-4">
        <ActivitySquare className="h-10 w-10 text-muted-foreground animate-pulse" />
        <div className="text-lg font-medium tracking-tight text-muted-foreground">Initializing Telemetry...</div>
      </div>
    );
  }

  if (noData) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground p-6">
        <header className="flex items-center justify-between border-b border-border/50 pb-4 mb-10">
          <div className="flex items-center gap-2">
            <ActivitySquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">MeterDash</h1>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Radio className="h-10 w-10 text-muted-foreground animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold">Waiting for telemetry...</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              The dashboard is actively polling. Point your meter to <code className="bg-muted px-1.5 py-0.5 rounded text-primary">POST /api/data</code> with a raw telemetry frame, or send a test frame below to see the UI come to life.
            </p>
          </div>
          
          <div className="w-full mt-8 max-w-lg">
            <TestFramePanel defaultOpen={true} />
          </div>
        </main>
      </div>
    );
  }

  const d = latestData.data;
  const h = historyData || [];
  const s = summaryData;

  const isStale = d.STALE === 1 || d.STALE === "1";
  const relativeTime = formatRelativeTime(latestData.timestamp);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header Band */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="flex items-center gap-3">
          <ActivitySquare className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">MeterDash</h1>
          <div className="h-4 w-px bg-border mx-2" />
          <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-muted/20">
            {latestData.meterId || "UNKNOWN"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono tabular-nums">{relativeTime}</span>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border",
            isStale 
              ? "bg-destructive/10 text-destructive border-destructive/20" 
              : "bg-success/10 text-success border-success/20"
          )}>
            <span className={cn("h-2 w-2 rounded-full", isStale ? "bg-destructive" : "bg-success animate-pulse")} />
            {isStale ? "Stale" : "Live"}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Hero Summary Strip */}
        {s && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <SummaryMetric label="Current Load" value={formatValue(d.KW, 2)} unit="kW" />
            <SummaryMetric label="Peak Load" value={formatValue(s.peakKw, 2)} unit="kW" />
            <SummaryMetric label="Avg PF" value={formatValue(s.avgPf, 3)} />
            <SummaryMetric label="Avg Freq" value={formatValue(s.avgFreq, 2)} unit="Hz" />
            <SummaryMetric label="Signal (RSSI)" value={formatValue(s.avgRssi, 0)} unit="dBm" />
            <SummaryMetric label="Fwd Energy" value={formatValue(s.kwhFwd, 1)} unit="kWh" />
            <SummaryMetric label="Frames Rx" value={s.framesReceived.toLocaleString()} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          {/* Voltage */}
          <MeterCard title="Voltage" className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75 fill-mode-both">
            <ParameterRow label="V1n" description="Phase 1 - Neutral" value={d.V1n} unit="V" />
            <ParameterRow label="V2n" description="Phase 2 - Neutral" value={d.V2n} unit="V" />
            <ParameterRow label="V3n" description="Phase 3 - Neutral" value={d.V3n} unit="V" />
            <ParameterRow label="Vavg" description="Average Voltage" value={d.Vavg} unit="V" />
            <div className="mt-4 pt-4 border-t border-border/50">
              <span className="text-xs text-muted-foreground font-medium mb-2 block">Vavg Trend</span>
              <Sparkline data={h} dataKey="Vavg" color="hsl(var(--chart-1))" />
            </div>
            <div className="mt-4 space-y-1">
              <ParameterRow label="V12" description="Phase 1 - Phase 2" value={d.V12} unit="V" />
              <ParameterRow label="V23" description="Phase 2 - Phase 3" value={d.V23} unit="V" />
              <ParameterRow label="V31" description="Phase 3 - Phase 1" value={d.V31} unit="V" />
            </div>
          </MeterCard>

          {/* Current */}
          <MeterCard title="Current" className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
            <ParameterRow label="I1" description="Phase 1 Current" value={d.I1} unit="A" />
            <ParameterRow label="I2" description="Phase 2 Current" value={d.I2} unit="A" />
            <ParameterRow label="I3" description="Phase 3 Current" value={d.I3} unit="A" />
            <ParameterRow label="Iavg" description="Average Current" value={d.Iavg} unit="A" />
            <div className="mt-4 pt-4 border-t border-border/50">
              <span className="text-xs text-muted-foreground font-medium mb-2 block">Iavg Trend</span>
              <Sparkline data={h} dataKey="Iavg" color="hsl(var(--chart-2))" />
            </div>
            <div className="mt-4">
              <ParameterRow label="In" description="Neutral Current" value={d.In} unit="A" />
            </div>
          </MeterCard>

          {/* Power & Frequency */}
          <MeterCard title="Power & Frequency" className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
            <ParameterRow label="KW" description="Active Power" value={d.KW} unit="kW" />
            <ParameterRow label="KVA" description="Apparent Power" value={d.KVA} unit="kVA" />
            <ParameterRow label="KVAR" description="Reactive Power" value={d.KVAR} unit="kVAR" />
            <ParameterRow label="PF" description="Power Factor" value={d.PF} decimals={3} />
            <ParameterRow label="FREQ" description="Frequency" value={d.FREQ} unit="Hz" />
            <div className="mt-4 pt-4 border-t border-border/50">
              <span className="text-xs text-muted-foreground font-medium mb-2 block">KW Trend</span>
              <Sparkline data={h} dataKey="KW" color="hsl(var(--chart-3))" />
            </div>
          </MeterCard>

          {/* Harmonics & Unbalance */}
          <MeterCard title="Harmonics & Unbalance" className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
            <ParameterRow label="THDV1" description="Voltage THD 1" value={d.THDV1} unit="%" />
            <ParameterRow label="THDV2" description="Voltage THD 2" value={d.THDV2} unit="%" />
            <ParameterRow label="THDV3" description="Voltage THD 3" value={d.THDV3} unit="%" />
            <div className="my-2 border-b border-border/50" />
            <ParameterRow label="THDI1" description="Current THD 1" value={d.THDI1} unit="%" />
            <ParameterRow label="THDI2" description="Current THD 2" value={d.THDI2} unit="%" />
            <ParameterRow label="THDI3" description="Current THD 3" value={d.THDI3} unit="%" />
            <div className="my-2 border-b border-border/50" />
            <ParameterRow label="VUNB" description="Voltage Unbalance" value={d.VUNB} unit="%" />
            <ParameterRow label="IUNB" description="Current Unbalance" value={d.IUNB} unit="%" />
          </MeterCard>

          {/* Energy Forward */}
          <MeterCard title="Energy Import (Forward)" className="md:col-span-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 h-full items-center">
              <div className="flex flex-col items-center justify-center p-4 bg-muted/10 rounded-lg border border-border/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active</span>
                <span className="font-mono text-2xl font-bold text-foreground">{formatValue(d.KWH_FWD, 2)}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1">kWh</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-muted/10 rounded-lg border border-border/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Apparent</span>
                <span className="font-mono text-2xl font-bold text-foreground">{formatValue(d.KVAH_FWD, 2)}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1">kVAh</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-muted/10 rounded-lg border border-border/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reactive</span>
                <span className="font-mono text-2xl font-bold text-foreground">{formatValue(d.KVARH_FWD, 2)}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1">kVARh</span>
              </div>
            </div>
          </MeterCard>

          {/* Energy Reverse */}
          <MeterCard title="Energy Export (Reverse)" className="md:col-span-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 h-full items-center">
              <div className="flex flex-col items-center justify-center p-4 bg-muted/10 rounded-lg border border-border/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active</span>
                <span className="font-mono text-2xl font-bold text-foreground">{formatValue(d.KWH_REV, 2)}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1">kWh</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-muted/10 rounded-lg border border-border/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Apparent</span>
                <span className="font-mono text-2xl font-bold text-foreground">{formatValue(d.KVAH_REV, 2)}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1">kVAh</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-muted/10 rounded-lg border border-border/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reactive</span>
                <span className="font-mono text-2xl font-bold text-foreground">{formatValue(d.KVARH_REV, 2)}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1">kVARh</span>
              </div>
            </div>
          </MeterCard>

          {/* System Health */}
          <MeterCard title="System Health & Events" className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
            <ParameterRow label="Interruptions" description="INTR count" value={d.INTR} decimals={0} />
            <ParameterRow label="Signal" description="RSSI" value={d.RSSI} unit="dBm" decimals={0} />
            <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
              <span className="text-sm font-medium text-foreground/80">Meter Status</span>
              <StatusBadge status={d.MTR} />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
              <span className="text-sm font-medium text-foreground/80">GPRS Status</span>
              <StatusBadge status={d.GPRS} />
            </div>
          </MeterCard>

        </div>

        {/* Footer / Utilities */}
        <div className="pt-8 pb-4 flex justify-end">
          <div className="w-80">
            <TestFramePanel />
          </div>
        </div>

      </main>
    </div>
  );
}

function SummaryMetric({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-3 flex flex-col justify-center shadow-sm">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold font-mono text-foreground tracking-tight">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | number | undefined }) {
  const isOk = status === 1 || status === "1";
  return (
    <Badge variant="outline" className={cn(
      "font-mono text-[10px] uppercase",
      isOk ? "text-success border-success/30 bg-success/10" : "text-destructive border-destructive/30 bg-destructive/10"
    )}>
      {isOk ? (
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> OK</span>
      ) : (
        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> FAIL</span>
      )}
    </Badge>
  );
}
