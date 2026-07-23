import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Camera, 
  Calendar, 
  Users, 
  Building2, 
  Edit3, 
  Check, 
  X, 
  RotateCcw,
  Copy,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  getSnapshotDetail, 
  updateSnapshotCompany, 
  updateSnapshotProperty,
  SnapshotDetail,
  SnapshotCompany,
  SnapshotProperty
} from '../api/snapshots';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const SnapshotDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<SnapshotDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [editingEntity, setEditingEntity] = useState<{ type: 'company' | 'property', id: string } | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const data = await getSnapshotDetail(id!);
      setSnapshot(data);
    } catch (error) {
      console.error('Failed to fetch snapshot detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCompanies = snapshot?.companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.isin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.snapshotCompanyUid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.originalCompanyId.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const toggleCompany = (companyUid: string) => {
    const next = new Set(expandedCompanies);
    if (next.has(companyUid)) next.delete(companyUid);
    else next.add(companyUid);
    setExpandedCompanies(next);
  };

  const startEditing = (type: 'company' | 'property', entity: any) => {
    setEditingEntity({ type, id: type === 'company' ? entity.snapshotCompanyUid : entity.snapshotPropertyUid });
    setEditValues({ ...entity });
  };

  const cancelEditing = () => {
    setEditingEntity(null);
    setEditValues({});
  };

  const handleSave = async () => {
    if (!editingEntity || !snapshot) return;
    setIsSaving(true);
    try {
      if (editingEntity.type === 'company') {
        await updateSnapshotCompany(snapshot.id, editingEntity.id, editValues);
      } else {
        await updateSnapshotProperty(snapshot.id, editingEntity.id, editValues);
      }
      await fetchDetail();
      setEditingEntity(null);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save overrides.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToLive = async (type: 'company' | 'property', entityUid: string) => {
    if (!snapshot || !window.confirm('Reset this record to its live values? All snapshot overrides will be cleared.')) return;
    setIsSaving(true);
    try {
      // Sending null for override fields clears them in the backend mapping
      const resetData: any = type === 'company' 
        ? { name: null, isin: null, status: null, reportPropertyCount: null, notes: null }
        : { name: null, addressLine1: null, city: null, gfaSqft: null, propertyLevel: null, notes: null };

      if (type === 'company') {
        await updateSnapshotCompany(snapshot.id, entityUid, resetData);
      } else {
        await updateSnapshotProperty(snapshot.id, entityUid, resetData);
      }
      await fetchDetail();
      setEditingEntity(null);
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Failed to reset to live values.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-900">Snapshot Not Found</h3>
        <button onClick={() => navigate('/snapshots')} className="mt-4 text-blue-600 font-bold">
          &larr; Back to Snapshots
        </button>
      </div>
    );
  }

  const totalCompanies = snapshot.companies.length;
  const totalProperties = snapshot.companies.reduce((sum, c) => sum + c.totalPropertyCount, 0);
  const totalGfa = snapshot.companies.reduce((sum, c) => sum + c.totalGfaSqft, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate('/snapshots')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-black uppercase tracking-widest">
                #{snapshot.snapshotNumber.toString().padStart(3, '0')}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{snapshot.name}</h1>
            </div>
            <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
              <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> {snapshot.year}</span>
              <span>Created by <span className="font-bold text-gray-700">{snapshot.createdBy}</span> on {format(new Date(snapshot.createdAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-6 bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900">{totalCompanies}</div>
            <div className="text-[10px] text-gray-400 uppercase font-black">Companies</div>
          </div>
          <div className="text-center border-x border-gray-100 px-6">
            <div className="text-sm font-bold text-gray-900">{totalProperties}</div>
            <div className="text-[10px] text-gray-400 uppercase font-black">Properties</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900">{(totalGfa / 1000).toFixed(0)}k</div>
            <div className="text-[10px] text-gray-400 uppercase font-black">Total GFA</div>
          </div>
        </div>
      </div>

      {/* Snapshot Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Snapshot Companies</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filter list..." 
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">Identifiers</th>
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">ISIN</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Props</th>
                <th className="px-6 py-4">GFA (sqft)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCompanies.map((company) => (
                <React.Fragment key={company.snapshotCompanyUid}>
                  <tr className={cn(
                    "hover:bg-gray-50 transition-colors group",
                    expandedCompanies.has(company.snapshotCompanyUid) && "bg-blue-50/30"
                  )}>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleCompany(company.snapshotCompanyUid)} className="p-1 hover:bg-gray-200 rounded transition-colors">
                        {expandedCompanies.has(company.snapshotCompanyUid) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center text-[10px] text-blue-600 font-mono">
                          <span className="w-16">SN_UID:</span>
                          <span className="font-bold">{company.snapshotCompanyUid.substring(0, 8)}...</span>
                          <button onClick={() => copyToClipboard(company.snapshotCompanyUid)} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="w-3 h-3" /></button>
                        </div>
                        <div className="flex items-center text-[10px] text-gray-400 font-mono">
                          <span className="w-16">LIVE_ID:</span>
                          <span>{company.originalCompanyId.substring(0, 8)}...</span>
                          <button onClick={() => copyToClipboard(company.originalCompanyId)} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="w-3 h-3" /></button>
                          <Link to={`/companies/${company.originalCompanyId}`} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700" title="View Live Company"><ExternalLink className="w-3 h-3" /></Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingEntity?.id === company.snapshotCompanyUid ? (
                        <input 
                          className="w-full px-2 py-1 border border-blue-500 rounded text-sm outline-none"
                          value={editValues.name}
                          onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                        />
                      ) : (
                        <div className="text-sm font-bold text-gray-900">{company.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingEntity?.id === company.snapshotCompanyUid ? (
                        <input 
                          className="w-full px-2 py-1 border border-blue-500 rounded text-sm outline-none"
                          value={editValues.isin || ''}
                          onChange={(e) => setEditValues({ ...editValues, isin: e.target.value })}
                        />
                      ) : (
                        <div className="text-sm text-gray-500">{company.isin || '—'}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        company.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      )}>
                        {company.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500 font-mono">{company.totalPropertyCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{company.totalGfaSqft.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      {editingEntity?.id === company.snapshotCompanyUid ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            disabled={isSaving}
                            onClick={handleSave}
                            className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            title="Save Changes"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={cancelEditing}
                            className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-1">
                          <button 
                            onClick={() => handleResetToLive('company', company.snapshotCompanyUid)}
                            className="p-1.5 text-gray-300 hover:text-orange-600 hover:bg-orange-50 rounded transition-all"
                            title="Reset to Live Values"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => startEditing('company', company)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title="Edit Snapshot Override"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Properties Sub-table */}
                  {expandedCompanies.has(company.snapshotCompanyUid) && (
                    <tr>
                      <td colSpan={8} className="px-12 py-4 bg-gray-50/50">
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100">
                                <th className="px-6 py-3">Identifiers</th>
                                <th className="px-6 py-3">Property Name</th>
                                <th className="px-6 py-3">Address</th>
                                <th className="px-6 py-3">GFA (sqft)</th>
                                <th className="px-6 py-3">Level</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {company.properties.map((property) => (
                                <tr key={property.snapshotPropertyUid} className="group hover:bg-blue-50/20 transition-colors">
                                  <td className="px-6 py-3">
                                    <div className="flex flex-col space-y-0.5">
                                      <div className="flex items-center text-[9px] text-blue-500 font-mono">
                                        <span className="w-12">SN_UID:</span>
                                        <span className="font-bold">{property.snapshotPropertyUid.substring(0, 8)}...</span>
                                        <button onClick={() => copyToClipboard(property.snapshotPropertyUid)} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="w-2.5 h-2.5" /></button>
                                      </div>
                                      <div className="flex items-center text-[9px] text-gray-400 font-mono">
                                        <span className="w-12">LIVE_ID:</span>
                                        <span>{property.originalPropertyId.substring(0, 8)}...</span>
                                        <button onClick={() => copyToClipboard(property.originalPropertyId)} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="w-2.5 h-2.5" /></button>
                                        <Link to={`/properties/${property.originalPropertyId}`} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700" title="View Live Property"><ExternalLink className="w-2.5 h-2.5" /></Link>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3">
                                    {editingEntity?.id === property.snapshotPropertyUid ? (
                                      <input 
                                        className="w-full px-2 py-1 border border-blue-500 rounded text-xs outline-none"
                                        value={editValues.name}
                                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                      />
                                    ) : (
                                      <div className="text-xs font-bold text-gray-900">{property.name || '—'}</div>
                                    )}
                                  </td>
                                  <td className="px-6 py-3 text-xs text-gray-500">{property.addressLine1}, {property.city}</td>
                                  <td className="px-6 py-3 text-xs text-gray-700 font-mono">{property.gfaSqft?.toLocaleString() || '—'}</td>
                                  <td className="px-6 py-3">
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase">
                                      {property.propertyLevel}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    {editingEntity?.id === property.snapshotPropertyUid ? (
                                      <div className="flex items-center justify-end space-x-1">
                                        <button 
                                          disabled={isSaving}
                                          onClick={handleSave}
                                          className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                          title="Save Changes"
                                        >
                                          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                        </button>
                                        <button 
                                          onClick={cancelEditing}
                                          className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                                          title="Cancel"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-end space-x-1">
                                        <button 
                                          onClick={() => handleResetToLive('property', property.snapshotPropertyUid)}
                                          className="p-1 text-gray-300 hover:text-orange-600 hover:bg-orange-50 rounded transition-all"
                                          title="Reset to Live Values"
                                        >
                                          <RotateCcw className="w-3 h-3" />
                                        </button>
                                        <button 
                                          onClick={() => startEditing('property', property)}
                                          className="p-1 text-gray-300 hover:text-blue-600 transition-colors"
                                          title="Edit Snapshot Override"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SnapshotDetails;
