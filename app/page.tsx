"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Zap, 
  Waves, 
  BatteryMedium, 
  BatteryCharging, 
  Server, 
  Clock
} from 'lucide-react';
import { TelemetryData } from '@/utils/parser';

const DataRow = ({ label, value, unit, isStatus }: { label: string, value: string | number | undefined, unit?: string, isStatus?: boolean }) => {
  const displayValue = value === undefined ? '--' : value;
  
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/20 transition-colors px-1 rounded-sm">
      <span className="text-gray-400 font-mono text-sm tracking-tight">{label}</span>
      <span className="text-gray-100 font-semibold text-sm">
        {isStatus ? (
          displayValue === 1 ? (
            <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-xs">OK</span>
          ) : displayValue === 0 ? (
            <span className="text-red-400 bg-red-400/10 px-2 py-0.5 rounded text-xs">FAIL</span>
          ) : (
            <span className="text-gray-500">--</span>
          )
        ) : (
          <>
            {displayValue} 
            {unit && displayValue !== '--' && <span className="text-gray-500 font-normal text-xs ml-1.5">{unit}</span>}
          </>
        )}
      </span>
    </div>
  );
};

const Card = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
    <div className="bg-gray-900 border-b border-gray-800 px-5 py-3.5 flex items-center gap-2.5">
      <Icon className="w-4 h-4 text-emerald-500" />
      <h3 className="text-gray-200 font-medium text-sm tracking-wide">{title}</h3>
    </div>
    <div className="p-5 flex flex-col gap-1">
      {children}
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();

      if (result) {
        setData(result);
        setLastFetched(new Date());
        setError(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch data");
    }
  }, []);

  useEffect(() => {
    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const payload = data?.payload || {};
  const isStale = payload['STALE'] === 1;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-emerald-500/30">
      
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">MeterDash</h1>
            {data && (
              <span className="ml-2 px-2.5 py-1 bg-gray-800 text-gray-300 text-xs font-mono rounded border border-gray-700">
                {data.meterId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-6 text-sm">
            {error && (
              <div className="text-red-400 text-xs px-2 py-1 bg-red-500/10 rounded">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-4 h-4" />
              <span>
                {lastFetched ? lastFetched.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) : 'Waiting for data...'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-900 py-1.5 px-3 rounded-full border border-gray-800">
              <div className={`w-2.5 h-2.5 rounded-full ${isStale || !data ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></div>
              <span className={`text-xs font-bold tracking-widest ${isStale || !data ? 'text-red-400' : 'text-emerald-400'}`}>
                {isStale ? 'STALE' : !data ? 'OFFLINE' : 'LIVE'}
              </span>
            </div>
          </div>
          
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!data ? (
          <div className="flex items-center justify-center h-64 text-gray-500 flex-col gap-4">
             <div className="w-8 h-8 border-4 border-gray-800 border-t-emerald-500 rounded-full animate-spin"></div>
             <p>Awaiting initial telemetry payload on <span className="font-mono text-emerald-400/80">POST /api/data</span></p>
             <div className="bg-gray-900 p-4 rounded text-sm font-mono border border-gray-800 text-gray-400 mt-4 text-center">
                Example:<br/>
                curl -X POST http://localhost:3000/api/data \<br/>
                -H "Content-Type: text/plain" \<br/>
                -d "frame$EM6400,V1n:239.8,KW:7.82,STALE:0,Z"
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Card title="Voltage" icon={Zap}>
              <DataRow label="V1n (Phase 1-N)" value={payload.V1n} unit="V" />
              <DataRow label="V2n (Phase 2-N)" value={payload.V2n} unit="V" />
              <DataRow label="V3n (Phase 3-N)" value={payload.V3n} unit="V" />
              <DataRow label="V12 (Phase 1-2)" value={payload.V12} unit="V" />
              <DataRow label="V23 (Phase 2-3)" value={payload.V23} unit="V" />
              <DataRow label="V31 (Phase 3-1)" value={payload.V31} unit="V" />
              <DataRow label="Vavg (Average)" value={payload.Vavg} unit="V" />
            </Card>

            <Card title="Current" icon={Activity}>
              <DataRow label="I1 (Phase 1)" value={payload.I1} unit="A" />
              <DataRow label="I2 (Phase 2)" value={payload.I2} unit="A" />
              <DataRow label="I3 (Phase 3)" value={payload.I3} unit="A" />
              <DataRow label="In (Neutral)" value={payload.In} unit="A" />
              <DataRow label="Iavg (Average)" value={payload.Iavg} unit="A" />
            </Card>

            <Card title="Power & Frequency" icon={Waves}>
              <DataRow label="KW (Active)" value={payload.KW} unit="kW" />
              <DataRow label="KVA (Apparent)" value={payload.KVA} unit="kVA" />
              <DataRow label="KVAR (Reactive)" value={payload.KVAR} unit="kVAR" />
              <DataRow label="PF (Power Factor)" value={payload.PF} />
              <DataRow label="FREQ (Frequency)" value={payload.FREQ} unit="Hz" />
            </Card>

            <Card title="Harmonics & Unbalance" icon={Activity}>
              <DataRow label="THDV1 (Vol THD 1)" value={payload.THDV1} unit="%" />
              <DataRow label="THDV2 (Vol THD 2)" value={payload.THDV2} unit="%" />
              <DataRow label="THDV3 (Vol THD 3)" value={payload.THDV3} unit="%" />
              <DataRow label="THDI1 (Cur THD 1)" value={payload.THDI1} unit="%" />
              <DataRow label="THDI2 (Cur THD 2)" value={payload.THDI2} unit="%" />
              <DataRow label="THDI3 (Cur THD 3)" value={payload.THDI3} unit="%" />
              <DataRow label="VUNB (Vol Unbalance)" value={payload.VUNB} unit="%" />
              <DataRow label="IUNB (Cur Unbalance)" value={payload.IUNB} unit="%" />
            </Card>

            <Card title="Energy Import (Forward)" icon={BatteryCharging}>
              <DataRow label="KWH_FWD (Active)" value={payload.KWH_FWD} unit="kWh" />
              <DataRow label="KVAH_FWD (Apparent)" value={payload.KVAH_FWD} unit="kVAh" />
              <DataRow label="KVARH_FWD (Reactive)" value={payload.KVARH_FWD} unit="kVARh" />
            </Card>

            <Card title="Energy Export (Reverse)" icon={BatteryMedium}>
              <DataRow label="KWH_REV (Active)" value={payload.KWH_REV} unit="kWh" />
              <DataRow label="KVAH_REV (Apparent)" value={payload.KVAH_REV} unit="kVAh" />
              <DataRow label="KVARH_REV (Reactive)" value={payload.KVARH_REV} unit="kVARh" />
            </Card>

            <Card title="System Health" icon={Server}>
              <DataRow label="INTR (Interruptions)" value={payload.INTR} unit="Count" />
              <DataRow label="RSSI (Signal)" value={payload.RSSI} unit="dBm" />
              <DataRow label="MTR (Meter Status)" value={payload.MTR} isStatus={true} />
              <DataRow label="GPRS (Network)" value={payload.GPRS} isStatus={true} />
            </Card>

          </div>
        )}
      </main>
    </div>
  );
}
