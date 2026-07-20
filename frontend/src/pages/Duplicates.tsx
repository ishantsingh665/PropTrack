import React, { useState, useEffect, useCallback } from 'react';
import { 
  Copy, 
  Search, 
  Check, 
  X, 
  ArrowRightLeft, 
  AlertCircle, 
  RefreshCw,
  Building2,
  MapPin,
  ChevronRight,
  Split
} from 'lucide-react';
import { 
  getDuplicates, 
  scanDuplicates, 
  updateDuplicateStatus, 
  mergeDuplicates,
  DuplicatePair 
} from '../api/duplicates';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const Duplicates: React.FC = () => {
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [filters, setFilters] = useState({
    status: 'pending',
    scope: '',
    matchLevel: '',
  });

  const fetchPairs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDuplicates(filters);
      setPairs(data);
    } catch (error) {
      console.error('Failed to fetch duplicates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPairs();
  }, [fetchPairs]);

  const handleScan = async () => {
    if (!window.confirm('Trigger a full portfolio scan? This may take a few moments.')) return;
    setIsScanning(true);
    try {
      const result = await scanDuplicates();
      alert(`Scan complete. Found ${result.found} pairs.`);
      fetchPairs();
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateDuplicateStatus(id, status);
      fetchPairs();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleMerge = async (pair: DuplicatePair, keepId: string) => {
    const removeId = keepId === pair.property1Id ? pair.property2Id : pair.property1Id;
    const keepName = keepId === pair.property1Id ? pair.property1.name : pair.property2.name;

    if (!window.confirm(`Merge these records? ${keepName} will be the canonical record. This cannot be undone.`)) return;

    try {
      await mergeDuplicates(pair.id, keepId, removeId);
      fetchPairs();
    } catch (error) {
      console.error('Merge failed:', error);
      alert('Merge failed. Check audit logs for details.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'duplicate': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'not_duplicate': return 'bg-gray-100 text-gray-500 border-gray-200';
      case 'merged': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getScopeLabel = (scope: string) => scope.replace('_', ' ');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Duplicate Resolution</h1>
          <p className="text-sm text-gray-500 mt-1">Review potential matches and consolidate records to maintain data integrity.</p>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isScanning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          Scan Portfolio
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
          <select 
            className="w-full text-sm border-gray-200 rounded-lg focus:ring-blue-500 text-black"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Pairs</option>
            <option value="pending">Pending Review</option>
            <option value="duplicate">Marked Duplicate</option>
            <option value="not_duplicate">Not Duplicate</option>
            <option value="merged">Already Merged</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Scope</label>
          <select 
            className="w-full text-sm border-gray-200 rounded-lg focus:ring-blue-500 text-black"
            value={filters.scope}
            onChange={(e) => setFilters({ ...filters, scope: e.target.value })}
          >
            <option value="">Any Scope</option>
            <option value="same_company">Same Company</option>
            <option value="cross_company">Cross Company</option>
            <option value="no_shared_ownership">No Shared Ownership</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Level</label>
          <select 
            className="w-full text-sm border-gray-200 rounded-lg focus:ring-blue-500 text-black"
            value={filters.matchLevel}
            onChange={(e) => setFilters({ ...filters, matchLevel: e.target.value })}
          >
            <option value="">Any Level</option>
            <option value="building">Same Address (Building)</option>
            <option value="unit">Same Building + Unit</option>
            <option value="cross_level">Cross-Level Match</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {pairs.map((pair) => (
          <div key={pair.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider", getStatusBadge(pair.status))}>
                  {pair.status}
                </span>
                <span className="text-xs text-gray-500 font-medium capitalize">
                  {getScopeLabel(pair.scope)} • {pair.matchLevel}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 font-mono">
                PAIR ID: {pair.id.substring(0, 8)}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-gray-100">
              {/* Property 1 */}
              <div className="bg-white p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{pair.property1.name || pair.property1.addressLine1}</h3>
                      <div className="flex items-center text-xs text-gray-500 mt-0.5">
                        <MapPin className="w-3 h-3 mr-1" />
                        {pair.property1.city}, {pair.property1.countryCode}
                      </div>
                    </div>
                  </div>
                  {pair.status === 'duplicate' && (
                    <button
                      onClick={() => handleMerge(pair, pair.property1Id)}
                      className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors flex items-center"
                    >
                      <Split className="w-3.5 h-3.5 mr-1.5 rotate-180" />
                      Merge Into This
                    </button>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-0.5">GFA</span>
                    <span className="font-medium text-gray-900">{pair.property1.gfaSqft?.toLocaleString()} sqft</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Type</span>
                    <span className="font-medium text-gray-900">{pair.property1.type?.name}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Active Stakes</span>
                  <div className="flex flex-wrap gap-1">
                    {pair.property1.companies?.map((s: any) => (
                      <span key={s.id} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium">
                        {s.company.name} ({s.ownershipPct}%)
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Property 2 */}
              <div className="bg-white p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{pair.property2.name || pair.property2.addressLine1}</h3>
                      <div className="flex items-center text-xs text-gray-500 mt-0.5">
                        <MapPin className="w-3 h-3 mr-1" />
                        {pair.property2.city}, {pair.property2.countryCode}
                      </div>
                    </div>
                  </div>
                  {pair.status === 'duplicate' && (
                    <button
                      onClick={() => handleMerge(pair, pair.property2Id)}
                      className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors flex items-center"
                    >
                      <Split className="w-3.5 h-3.5 mr-1.5 rotate-180" />
                      Merge Into This
                    </button>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-0.5">GFA</span>
                    <span className="font-medium text-gray-900">{pair.property2.gfaSqft?.toLocaleString()} sqft</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Type</span>
                    <span className="font-medium text-gray-900">{pair.property2.type?.name}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Active Stakes</span>
                  <div className="flex flex-wrap gap-1">
                    {pair.property2.companies?.map((s: any) => (
                      <span key={s.id} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium">
                        {s.company.name} ({s.ownershipPct}%)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {pair.status === 'pending' && (
              <div className="p-4 bg-gray-50 flex items-center justify-end space-x-3 border-t border-gray-100">
                <button
                  onClick={() => handleStatusUpdate(pair.id, 'not_duplicate')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Not Duplicate
                </button>
                <button
                  onClick={() => handleStatusUpdate(pair.id, 'duplicate')}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark as Duplicate
                </button>
              </div>
            )}
          </div>
        ))}

        {pairs.length === 0 && !isLoading && (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">All clear!</h3>
            <p className="text-gray-500">No pending duplicate pairs found with these filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Duplicates;
