import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Layers, 
  History, 
  Users, 
  User,
  Check,
  Calendar, 
  Trash2, 
  Edit2, 
  Plus,
  ArrowRight,
  ExternalLink,
  Info,
  ChevronRight,
  ArrowRightLeft,
  Copy,
  AlertCircle
} from 'lucide-react';
import { 
  getProperty, 
  getPropertyHistory, 
  getPropertyOwnership, 
  deleteHistoryEntry,
  updatePropertyStatus,
  updateProperty
} from '../api/properties';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [ownership, setOwnership] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'ownership' | 'units'>('info');

  const [isEditingGeocode, setIsEditingGeocode] = useState(false);
  const [coords, setCoords] = useState({ lat: '', lon: '' });

  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [propData, historyData, ownershipData] = await Promise.all([
        getProperty(id),
        getPropertyHistory(id),
        getPropertyOwnership(id)
      ]);
      setProperty(propData);
      setHistory(historyData);
      setOwnership(ownershipData);
      setCoords({ 
        lat: propData.latitude?.toString() || '', 
        lon: propData.longitude?.toString() || '' 
      });
    } catch (error) {
      console.error('Failed to fetch property details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateGeocode = async () => {
    try {
      await updateProperty(id!, {
        latitude: parseFloat(coords.lat),
        longitude: parseFloat(coords.lon),
        logEntry: `Manual geocode override: ${coords.lat}, ${coords.lon}`
      });
      setIsEditingGeocode(false);
      fetchData();
    } catch (error) {
      alert('Failed to update coordinates.');
    }
  };

  const handleDeleteHistory = async (logId: string) => {
    const reason = window.prompt('Enter reason for deleting this entry (admin only):');
    if (!reason) return;

    try {
      await deleteHistoryEntry(id!, logId, reason);
      fetchData();
    } catch (error) {
      alert('Failed to delete history entry. Ensure you have admin privileges.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'sold': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'transferred': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'reversed': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-20 text-black">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900">Property not found</h3>
        <Link to="/properties" className="text-blue-600 hover:underline mt-4 inline-block">Back to Portfolio</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-black pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <button 
            onClick={() => navigate('/properties')}
            className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all mt-1"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">{property.name || property.addressLine1}</h1>
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                property.propertyLevel === 'building' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"
              )}>
                {property.propertyLevel}
              </span>
            </div>
            <div className="flex items-center text-gray-500 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">{property.addressLine1}, {property.city}, {property.countryCode}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-gray-50 transition-colors">
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-8 border-b border-gray-200">
        {[
          { id: 'info', name: 'Overview', icon: Building2 },
          { id: 'history', name: 'Building Log', icon: History },
          { id: 'ownership', name: 'Ownership Timeline', icon: Users },
          { id: 'units', name: `Units (${property.units?.length || 0})`, icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center pb-4 text-sm font-bold uppercase tracking-wider transition-all relative",
                isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.name}
              {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'info' && (
            <>
              {/* Detailed Specs */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Total GFA</span>
                  <span className="text-lg font-bold text-gray-900">{property.gfaSqft?.toLocaleString() || '—'}</span>
                  <span className="text-xs text-gray-400 ml-1">sqft</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Property Type</span>
                  <span className="text-lg font-bold text-gray-900">{property.type?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Postal Code</span>
                  <span className="text-lg font-bold text-gray-900">{property.postalCode || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">City</span>
                  <span className="text-lg font-bold text-gray-900">{property.city}</span>
                </div>
              </div>

              {/* Active Ownership */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Active Ownership Stakes</h3>
                  <button className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Stake
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {property.companies?.filter((s: any) => !s.validTo).map((stake: any) => (
                    <div key={stake.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                          {stake.company.name.charAt(0)}
                        </div>
                        <div>
                          <Link to={`/companies/${stake.company.id}`} className="text-sm font-bold text-gray-900 hover:text-blue-600 flex items-center">
                            {stake.company.name}
                            <ExternalLink className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                            SINCE {format(new Date(stake.validFrom), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="text-sm font-black text-gray-900">{stake.ownershipPct}%</div>
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-widest", getStatusColor(stake.status))}>
                            {stake.status}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  ))}
                  {(!property.companies || property.companies.filter((s: any) => !s.validTo).length === 0) && (
                    <div className="p-8 text-center text-gray-500 italic text-sm">
                      No active ownership records found.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Building History Log</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {history.map((log) => (
                  <div key={log.id} className="p-6 group relative">
                    <div className="flex items-center space-x-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
                      </span>
                      <span className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        User ID: {log.userId.substring(0, 8)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{log.entry}</p>
                    <button 
                      onClick={() => handleDeleteHistory(log.id)}
                      className="absolute top-6 right-6 p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="p-12 text-center">
                    <Info className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm italic">No entries in the building log.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ownership' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Ownership Timeline</h3>
              </div>
              <div className="p-6">
                <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-5 before:w-0.5 before:bg-gray-100">
                  {ownership.map((stake, idx) => (
                    <div key={stake.id} className="relative pl-12">
                      <div className="absolute left-3 top-2 w-4 h-4 rounded-full bg-white border-4 border-blue-600 z-10" />
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-gray-900">{stake.company.name}</h4>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                            stake.validTo ? "bg-gray-50 text-gray-400 border-gray-200" : "bg-green-50 text-green-700 border-green-100"
                          )}>
                            {stake.validTo ? 'Historical' : 'Current'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {format(new Date(stake.validFrom), 'MMM d, yyyy')} 
                          {stake.validTo ? ` — ${format(new Date(stake.validTo), 'MMM d, yyyy')}` : ' — Present'}
                        </div>
                        <div className="mt-2 flex items-center space-x-4">
                          <div className="text-sm font-black text-gray-900">{stake.ownershipPct}%</div>
                          <div className="text-[10px] font-bold uppercase text-gray-400">{stake.status}</div>
                        </div>
                        {stake.transferLegs && stake.transferLegs.length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center text-[10px]">
                            <ArrowRightLeft className="w-3 h-3 text-gray-400 mr-2" />
                            <span className="text-gray-500">Linked to Transfer </span>
                            <span className="font-mono text-blue-600 ml-1">#{stake.transferLegs[0].transfer.id.substring(0, 8)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'units' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Child Units</h3>
                <button className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Unit
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {property.units?.map((unit: any) => (
                  <div key={unit.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center font-bold text-[10px]">
                        U
                      </div>
                      <div>
                        <Link to={`/properties/${unit.id}`} className="text-sm font-bold text-gray-900 hover:text-blue-600">
                          {unit.name || `Unit ${unit.id.substring(0, 4)}`}
                        </Link>
                        <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                          {unit.gfaSqft?.toLocaleString() || 0} SQFT
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                ))}
                {(!property.units || property.units.length === 0) && (
                  <div className="p-12 text-center">
                    <Layers className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm italic">This building has no child units.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Quick Stats</h3>
              <button 
                onClick={() => setIsEditingGeocode(!isEditingGeocode)}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest"
              >
                {isEditingGeocode ? 'Cancel' : 'Override'}
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Normalized Address</span>
                <p className="text-sm font-medium text-slate-200 font-mono break-all">{property.addressNormalized}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Geocode Status</span>
                <div className="flex items-center">
                  <div className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    property.geocodeStatus === 'completed' || property.geocodeStatus === 'success' || property.geocodeStatus === 'manual_override' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : 
                    property.geocodeStatus === 'pending' ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                  )} />
                  <span className="text-sm font-bold capitalize">{property.geocodeStatus.replace('_', ' ')}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Coordinates</span>
                {isEditingGeocode ? (
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center space-x-2">
                      <input 
                        className="bg-slate-800 border-slate-700 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none w-full"
                        placeholder="Latitude"
                        value={coords.lat}
                        onChange={(e) => setCoords({ ...coords, lat: e.target.value })}
                      />
                      <input 
                        className="bg-slate-800 border-slate-700 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none w-full"
                        placeholder="Longitude"
                        value={coords.lon}
                        onChange={(e) => setCoords({ ...coords, lon: e.target.value })}
                      />
                    </div>
                    <button 
                      onClick={handleUpdateGeocode}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 rounded uppercase tracking-widest transition-colors flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 mr-1.5" />
                      Save Coordinates
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-200">
                    {property.latitude && property.longitude 
                      ? `${parseFloat(property.latitude).toFixed(6)}, ${parseFloat(property.longitude).toFixed(6)}`
                      : 'Not pinpointed'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center">
                <ArrowRightLeft className="w-4 h-4 mr-3 text-gray-400" />
                Initiate Transfer
              </button>
              <button className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center">
                <Copy className="w-4 h-4 mr-3 text-gray-400" />
                Find Duplicates
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('Soft-delete this property?')) {
                    // Logic for delete
                  }
                }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-3 text-red-400" />
                Soft Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
