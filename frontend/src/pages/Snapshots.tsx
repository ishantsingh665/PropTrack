import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight,
  Loader2,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  getSnapshots, 
  getSnapshotYears, 
  getSnapshotPreview, 
  createSnapshot, 
  Snapshot,
  SnapshotPreview 
} from '../api/snapshots';
import Modal from '../components/Modal';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const Snapshots: React.FC = () => {
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<SnapshotPreview | null>(null);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotYear, setSnapshotYear] = useState(new Date().getFullYear());
  const [isCreating, setIsCreating] = useState(false);
  const [createdSnapshot, setCreatedSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [snapList, yearList] = await Promise.all([
        getSnapshots(selectedYear === 'all' ? undefined : selectedYear),
        getSnapshotYears()
      ]);
      setSnapshots(snapList);
      setYears(yearList);
    } catch (error) {
      console.error('Failed to fetch snapshots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setIsCreateModalOpen(true);
    setIsPreviewLoading(true);
    setError(null);
    const monthName = format(new Date(), 'MMMM');
    const currentYear = new Date().getFullYear();
    setSnapshotName(`${monthName} ${currentYear}`);
    setSnapshotYear(currentYear);

    try {
      const preview = await getSnapshotPreview();
      setPreviewData(preview);
    } catch (error) {
      console.error('Failed to fetch preview:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await createSnapshot(snapshotName, snapshotYear);
      setCreatedSnapshot(result);
      setIsCreateModalOpen(false);
      setIsSuccessModalOpen(true);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create snapshot.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Snapshots</h1>
          <p className="text-sm text-gray-500 mt-1">Point-in-time index captures for historical tracking.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Snapshot
        </button>
      </div>

      {/* Year Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-gray-200">
        <button
          onClick={() => setSelectedYear('all')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            selectedYear === 'all' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          All
        </button>
        {years.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              selectedYear === year ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Snapshots Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : snapshots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100">
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Year</th>
                  <th className="px-6 py-4 text-center">Companies</th>
                  <th className="px-6 py-4 text-center">Properties</th>
                  <th className="px-6 py-4">Total GFA</th>
                  <th className="px-6 py-4">Created By</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {snapshots.map((snap) => (
                  <tr 
                    key={snap.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/snapshots/${snap.id}`)}
                  >
                    <td className="px-6 py-4 text-sm font-mono text-blue-600">
                      #{snap.snapshotNumber.toString().padStart(3, '0')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{snap.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{snap.year}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-center">{snap.companiesIncluded}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-center">{snap.propertiesIncluded}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {(snap.totalGfaSqft / 1000).toFixed(0)}k <span className="text-[10px] text-gray-400">sqft</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{snap.createdBy}</td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {format(new Date(snap.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-gray-900 font-bold">No Snapshots Found</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-xs">
              Point-in-time index captures help you track portfolio growth and history. Create your first one now.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-6 text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              + Initialize First Snapshot
            </button>
          </div>
        )}
      </div>

      {/* Create Snapshot Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Snapshot"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start">
            <Camera className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              This snapshot will capture all <strong>index-enabled</strong> companies and their <strong>active</strong> properties at this specific moment. This action cannot be undone.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Snapshot Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="e.g. July 2026"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Year</label>
              <input
                type="number"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={snapshotYear}
                onChange={(e) => setSnapshotYear(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Capture Preview</h4>
            {isPreviewLoading ? (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating preview stats...
              </div>
            ) : previewData ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{previewData.companiesCount}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Companies</div>
                </div>
                <div className="text-center border-x border-gray-200">
                  <div className="text-lg font-bold text-gray-900">{previewData.propertiesCount}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Properties</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{(previewData.totalGfaSqft / 1000).toFixed(0)}k</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Total GFA</div>
                </div>
              </div>
            ) : null}
          </div>

          {error && (
            <div className="flex items-center p-3 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-100">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSnapshot}
              disabled={isCreating || isPreviewLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
              Create Snapshot
            </button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Snapshot Created Successfully"
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Snapshot #{createdSnapshot?.snapshotNumber.toString().padStart(3, '0')} — "{createdSnapshot?.name}"
          </h3>
          <p className="text-sm text-gray-500 mt-2 max-w-xs">
            The snapshot has been successfully initialized and point-in-time records have been frozen.
          </p>

          <div className="grid grid-cols-3 gap-8 w-full mt-8 border-y border-gray-100 py-6">
            <div>
              <div className="text-xl font-bold text-gray-900">{createdSnapshot?.companiesIncluded}</div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Companies</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{createdSnapshot?.propertiesIncluded}</div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Properties</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{(createdSnapshot?.totalGfaSqft || 0 / 1000).toFixed(0)}k</div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Total GFA</div>
            </div>
          </div>

          <button
            onClick={() => {
              setIsSuccessModalOpen(false);
              navigate(`/snapshots/${createdSnapshot?.id}`);
            }}
            className="mt-8 w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors"
          >
            View Snapshot Archive &rarr;
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Snapshots;
