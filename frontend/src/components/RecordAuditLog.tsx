import React, { useState, useEffect } from 'react';
import { getAuditLogs, AuditLogEntry } from '../api/audit';
import { 
  History, 
  User, 
  Calendar, 
  ArrowRight,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface RecordAuditLogProps {
  tableName: string;
  recordId: string;
}

const RecordAuditLog: React.FC<RecordAuditLogProps> = ({ tableName, recordId }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [recordId]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getAuditLogs({ tableName, recordId, limit: 100 });
      setLogs(data.data);
    } catch (error) {
      console.error('Failed to fetch record audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChanges = (changes: any) => {
    if (!changes) return <span className="text-gray-400 italic">No detailed changes recorded.</span>;
    
    // Check if it's the new "INSERT" style with full data in 'diff' (which might be named 'changes' in frontend interface)
    // Actually, backend prisma.ts sends 'diff' field. frontend AuditLogEntry interface calls it 'changes'.
    
    return (
      <div className="space-y-2 mt-3">
        {Object.entries(changes).map(([key, value]: [string, any]) => (
          <div key={key} className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[120px]">{key}</span>
            <div className="flex items-center flex-1 min-w-0">
              {value.from !== undefined ? (
                <>
                  <span className="text-xs text-gray-500 line-through truncate">{String(value.from ?? 'null')}</span>
                  <ArrowRight className="w-3 h-3 mx-3 text-blue-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-blue-700 truncate">{String(value.to ?? 'null')}</span>
                </>
              ) : (
                <span className="text-xs font-bold text-gray-700 truncate">{String(value ?? 'null')}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.length > 0 ? (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:border-blue-200 transition-colors">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    log.action === 'create' ? "bg-green-50 text-green-600" :
                    log.action === 'update' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                  )}>
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-bold text-gray-900 uppercase tracking-tighter mr-2">{log.action}</span>
                      <span className="text-xs text-gray-400 font-mono">#{log.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex items-center text-[10px] text-gray-500 mt-0.5 space-x-3">
                      <span className="flex items-center"><User className="w-3 h-3 mr-1" /> {log.user?.name || 'System'}</span>
                      <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {format(new Date(log.changedAt), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  </div>
                </div>
                {expandedLog === log.id ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
              </div>
              
              {expandedLog === log.id && (
                <div className="px-4 pb-4 border-t border-gray-50 bg-white">
                  {renderChanges(log.changes)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <Info className="w-8 h-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-400 italic">No audit history found for this record.</p>
        </div>
      )}
    </div>
  );
};

export default RecordAuditLog;
