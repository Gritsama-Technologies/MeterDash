import React, { useState } from "react";
import { 
  useIngestMeterData, 
  getGetLatestMeterDataQueryKey, 
  getGetMeterHistoryQueryKey, 
  getGetMeterSummaryQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Send } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_FRAME = `frame$EM6400,V1n:239.8,V2n:240.4,V3n:238.9,V12:415.3,V23:416.1,V31:414.8,I1:12.34,I2:11.98,I3:12.21,Vavg:239.7,Iavg:12.18,KW:7.82,KVA:8.11,KVAR:2.34,PF:0.964,FREQ:49.98,THDV1:2.1,THDV2:2.3,THDV3:2.0,THDI1:4.2,THDI2:4.5,THDI3:4.1,KWH_FWD:12345.67,KVAH_FWD:12988.11,KVARH_FWD:4567.22,KWH_REV:12.34,KVAH_REV:15.67,KVARH_REV:3.45,INTR:5,In:0.42,IUNB:3.2,VUNB:1.1,RSSI:-71,MTR:1,GPRS:1,STALE:0,Z`;

export function TestFramePanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [frame, setFrame] = useState(SAMPLE_FRAME);
  const queryClient = useQueryClient();

  const ingestMutation = useIngestMeterData({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLatestMeterDataQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeterHistoryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeterSummaryQueryKey() });
        toast.success("Test frame sent successfully");
      },
      onError: (err) => {
        toast.error("Failed to send frame: " + (err.error || "Unknown error"));
      }
    }
  });

  const handleSend = () => {
    if (!frame.trim()) return;
    ingestMutation.mutate({ data: { raw: frame } });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card className="border-dashed bg-card/50">
        <CardHeader className="p-4 py-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full flex justify-between p-0 hover:bg-transparent">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Send className="h-4 w-4" />
                <span className="font-medium text-sm">Send test frame</span>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-3">
            <CardDescription>
              Paste a raw telemetry string to simulate incoming meter data.
            </CardDescription>
            <Textarea 
              value={frame} 
              onChange={(e) => setFrame(e.target.value)}
              className="font-mono text-xs h-24 bg-background"
              placeholder="frame$..."
            />
            <Button 
              size="sm" 
              onClick={handleSend} 
              disabled={ingestMutation.isPending || !frame.trim()}
              className="w-full"
            >
              {ingestMutation.isPending ? "Sending..." : "POST /api/data"}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
