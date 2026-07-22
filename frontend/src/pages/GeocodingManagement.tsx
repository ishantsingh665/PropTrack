import React, { useState, useEffect, useCallback } from 'react';
import { 
  MapPin, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Play, 
  MoreVertical,
  Search,
  ChevronRight,
  ExternalLink,
  History
} from 'lucide-react';
import { getGeocodeQueue, retryGeocodeJob, processGeocodeQueue, GeocodeJob } from '../api/geocoding';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const GeocodingManagement: React.FC = () => {
  const [jobs, setJobs] = useState<GeocodeJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getGeocodeQueue();
      setJobs(data);
    } catch (error) {
      console.error('Failed to fetch geocode queue:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleRetry = async (id: string) => {
    try {
      await retryGeocodeJob(id);
      fetchQueue();
    } catch (error) {
      alert('Failed to retry job.');
    }
  };

  const handleProcessNow = async () => {
    setIsProcessing(true);
    try {
      await processGeocodeQueue();
      fetchQueue();
    } catch (error) {
      alert('Manual processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Geocoding Management</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor background address lookup tasks and manage geocoding failures.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchQueue}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh Queue"
          >
            <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={handleProcessNow}
            disabled={isProcessing || jobs.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isProcessing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Process Queue Now
          </button>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">In Queue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
          <p className="text-xs text-gray-500 mt-1">Pending address validations</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between text-orange-500 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Retrying</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{jobs.filter(j => j.attempts > 0).length}</p>
          <p className="text-xs text-gray-500 mt-1">Multiple lookup attempts made</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between text-blue-500 mb-2">
            <MapPin className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Provider</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">Nominatim</p>
          <p className="text-xs text-gray-500 mt-1">OpenStreetMap Search Engine</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Active Queue</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100">
                <th className="px-6 py-4">Property & Address</th>
                <th className="px-6 py-4">Attempts</th>
                <th className="px-6 py-4">Next Run</th>
                <th className="px-6 py-4">Status / Error</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center mr-3 flex-shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate max-w-[300px]">
                          {job.property?.name || job.property?.addressLine1}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {job.property?.city}, {job.property?.countryCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3].map(i => (
                        <div 
                          key={i} 
                          className={cn(
                            "w-2 h-2 rounded-full",
                            job.attempts >= i ? "bg-orange-400" : "bg-gray-200"
                          )} 
                        />
                      ))}
                      <span className="text-xs font-medium text-gray-500 ml-2">{job.attempts}/3</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {format(new Date(job.nextRunAt), 'HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4">
                    {job.lastError ? (
                      <div className="flex items-center text-red-600 text-xs font-medium">
                        <AlertCircle className="w-3 h-3 mr-1.5" />
                        <span className="truncate max-w-[200px]" title={job.lastError}>{job.lastError}</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-blue-600 text-xs font-medium animate-pulse">
                        <Clock className="w-3 h-3 mr-1.5" />
                        Pending lookup...
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {job.attempts > 0 && (
                        <button
                          onClick={() => handleRetry(job.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Retry Now"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/properties/${job.propertyId}`)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        title="View Property"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic text-sm">
                    Geocoding queue is currently empty. All addresses are verified.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-start text-white shadow-xl">
        <History className="w-6 h-6 text-blue-400 mr-4 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-sm">Automated Pipeline Information</h3>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-3xl">
            Address verification happens asynchronously every 30 seconds. 
            Properties with 3 failed attempts are removed from the queue and flagged as <strong>Failed</strong> in the main portfolio. 
            You can manually override coordinates in the property editor if the provider cannot resolve an address.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GeocodingManagement;
