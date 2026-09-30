import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  User, 
  ShieldAlert, 
  FileText, 
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { requestsApi } from '../services/api';
import { StatusHistory } from '../types';
import { formatReportDateTime } from '../utils/dateFormatter';

interface CaseHistoryTimelineProps {
  requestId: number;
}

export const CaseHistoryTimeline: React.FC<CaseHistoryTimelineProps> = ({ requestId }) => {
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentStatus, setCurrentStatus] = useState<string>('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await requestsApi.getHistory(requestId);
      if (res.timeline) {
        setHistory(res.timeline);
        setCurrentStatus(res.current_status || '');
      }
    } catch (err) {
      console.error("Failed to load case history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) {
      fetchHistory();
    }
  }, [requestId]);

  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 font-medium">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
        Loading complete auditable case history...
      </div>
    );
  }

  const fullPipelineOrder = [
    "REQUESTED",
    "AI_ANALYZED",
    "RESOURCE_MATCHED",
    "TRANSPORT_CHECK",
    "NGO_NOTIFIED",
    "NGO_ACCEPTED",
    "RESPONDER_ASSIGNED",
    "ON_THE_WAY",
    "ASSISTANCE_PROVIDED",
    "COMPLETED"
  ];

  return (
    <div className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
            Auditable Case History Timeline
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
          {currentStatus.replace(/_/g, ' ')}
        </span>
      </div>

      {/* State Machine Stepper Overview */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center min-w-max gap-1">
          {fullPipelineOrder.map((step, idx) => {
            const isCompleted = history.some(h => h.new_status === step) || currentStatus === step;
            const isCurrent = currentStatus === step;

            return (
              <React.Fragment key={step}>
                <div 
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                    isCurrent 
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20' 
                      : isCompleted 
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-slate-800/40 text-slate-500 border border-slate-800'
                  }`}
                >
                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                  <span>{step.replace(/_/g, ' ')}</span>
                </div>
                {idx < fullPipelineOrder.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Audit Trail List */}
      <div className="relative pl-5 border-l-2 border-slate-700 space-y-4 pt-2">
        {history.length === 0 ? (
          <p className="text-xs text-slate-400">No transition history logged yet.</p>
        ) : (
          history.map((item) => (
            <div key={item.id} className="relative group">
              {/* Timeline Node Dot */}
              <div className="absolute -left-[26px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-emerald-400 font-mono">
                    {item.new_status.replace(/_/g, ' ')}
                  </span>
                  {item.previous_status && (
                    <span className="text-[10px] text-slate-400">
                      (from {item.previous_status.replace(/_/g, ' ')})
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatReportDateTime(item.timestamp)}
                </span>
              </div>

              <div className="mt-1 text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex items-start gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-slate-200">{item.changed_by}:</span>{' '}
                  <span className="text-slate-300">{item.notes || 'State transition executed.'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
