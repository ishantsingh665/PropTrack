import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Users, 
  Calendar, 
  FileText, 
  Edit2, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Globe,
  Briefcase,
  AlertCircle,
  Copy,
  Camera,
  History,
  Settings,
  Check,
  X,
  Upload,
  Loader2,
  Plus
} from 'lucide-react';
import { getCompany, updateCompany, Company } from '../api/companies';
import { getProperties, deleteProperty, createProperty } from '../api/properties';
import { getLastSnapshotForCompany, Snapshot } from '../api/snapshots';
import CompanyNotes from '../components/CompanyNotes';
import RecordAuditLog from '../components/RecordAuditLog';
import PropertyForm from '../components/PropertyForm';
import Modal from '../components/Modal';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const CompanyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<Snapshot | null>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'notes' | 'audit' | 'settings'>('portfolio');

  // Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [editValues, setEditValues] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleAddProperty = async (formData: any) => {
    console.log('CompanyDetails: Attempting to create property:', formData);
    try {
      await createProperty({ ...formData, initialCompanyId: id });
      console.log('CompanyDetails: Property created successfully');
      setIsAddingProperty(false);
      await fetchData(); // refresh the list
    } catch (error: any) {
      console.error('CompanyDetails: Failed to add property:', error);
      alert(error.response?.data?.message || 'Failed to add property');
    }
  };

  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [compData, propData, snapData] = await Promise.all([
        getCompany(id),
        getProperties({ companyId: id, limit: 100 }),
        getLastSnapshotForCompany(id)
      ]);
      setCompany(compData);
      setPortfolio(propData.data);
      setLastSnapshot(snapData);
    } catch (error) {
      console.error('Failed to fetch company details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveProfile = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await updateCompany(id, editValues);
      await fetchData();
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Failed to update company:', error);
      alert('Failed to update company profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProp = async (propId: string) => {
    if (!window.confirm('Are you sure you want to soft-delete this property?')) return;
    try {
      await deleteProperty(propId);
      await fetchData();
    } catch (error) {
      alert('Failed to delete property.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-black py-40">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-20 text-black">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900">Company not found</h3>
        <Link to="/companies" className="text-blue-600 hover:underline mt-4 inline-block">Back to Directory</Link>
      </div>
    );
  }

  const totalGfa = portfolio.reduce((acc, prop) => acc + (prop.gfaSqft || 0), 0);

  return (
    <div className="space-y-6 text-black pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <button 
            onClick={() => navigate('/companies')}
            className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all mt-1"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                company.status === 'active' ? "bg-green-50 text-green-600 border-green-100" : "bg-gray-50 text-gray-500 border-gray-100"
              )}>
                {company.status}
              </span>
              {company.indexListed && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border bg-blue-50 text-blue-600 border-blue-100">
                  INDEX LISTED
                </span>
              )}
            </div>
            <div className="flex items-center text-gray-500 mt-1">
              <Globe className="w-4 h-4 mr-1 text-gray-400" />
              <span className="text-sm font-medium">Reg: {company.registrationNumber || '—'}</span>
              <span className="mx-2 text-gray-300">•</span>
              <div className="flex items-center text-xs font-mono text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded group/id relative cursor-pointer" title={company.id}>
                <span className="font-bold mr-1.5 uppercase tracking-tighter">ID:</span>
                <span>{company.id.substring(0, 8)}...</span>
                <button 
                  onClick={() => navigator.clipboard.writeText(company.id)}
                  className="ml-1.5 opacity-0 group-hover/id:opacity-100 transition-opacity p-0.5 hover:bg-blue-100 rounded"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <span className="mx-2 text-gray-300">•</span>
              <Calendar className="w-4 h-4 mr-1 text-gray-400" />
              <span className="text-sm font-medium text-gray-400 uppercase">SINCE {format(new Date(company.createdAt), 'MMM yyyy')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate(`/import?companyId=${company.id}`)}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4 mr-2 text-blue-500" />
            Bulk Upload
          </button>
          <button 
            onClick={() => {
              setEditValues({ ...company });
              setIsEditingProfile(true);
              setActiveTab('settings');
            }}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-black transition-colors shadow-lg"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
            <Building2 className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">Live Assets</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{portfolio.length} Properties</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">Live GFA</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalGfa.toLocaleString()} <span className="text-xs font-normal text-gray-400 uppercase">sqft</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">Reported Count</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {company.reportPropertyCount || '—'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-4">
            <Camera className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">Last Snapshot</p>
          <p className="text-sm font-bold text-gray-900 mt-1 truncate" title={lastSnapshot?.name || 'Never captured'}>
            {lastSnapshot?.name || '—'}
          </p>
          {lastSnapshot && <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-tighter">Captured {format(new Date(lastSnapshot.createdAt), 'MMM d, yyyy')}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-8 border-b border-gray-200 pt-4">
        {[
          { id: 'portfolio', name: 'Asset Portfolio', icon: Building2 },
          { id: 'notes', name: 'Research & Notes', icon: FileText },
          { id: 'audit', name: 'Audit History', icon: History },
          { id: 'settings', name: 'Profile & Settings', icon: Settings },
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

      <div className="min-h-[400px]">
        {activeTab === 'portfolio' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Live Assets</h3>
              <button
                onClick={() => setIsAddingProperty(true)}
                className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Property
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100">
                    <th className="px-6 py-4">Property</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Stake</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {portfolio.map((prop) => {
                    const stake = prop.companies?.find((s: any) => s.companyId === company.id);
                    return (
                      <tr key={prop.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0",
                              prop.propertyLevel === 'building' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                            )}>
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <Link to={`/properties/${prop.id}`} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors truncate block">
                                {prop.name || prop.addressLine1}
                              </Link>
                              <div className="text-[10px] text-gray-400 flex items-center mt-0.5">
                                <MapPin className="w-2.5 h-2.5 mr-1" />
                                {prop.city}, {prop.countryCode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {prop.type?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-black text-gray-900">{stake?.ownershipPct}%</div>
                          <div className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">{stake?.status}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link to={`/properties/${prop.id}`} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {portfolio.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic text-sm">
                        This company currently has no linked properties.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[600px]">
            <CompanyNotes companyId={company.id} />
          </div>
        )}

        {activeTab === 'audit' && (
          <RecordAuditLog tableName="Company" recordId={company.id} />
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Company Profile & Governance</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage core identifiers and index visibility controls.</p>
                </div>
                {!isEditingProfile && (
                  <button 
                    onClick={() => {
                      setEditValues({ ...company });
                      setIsEditingProfile(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Company Name</label>
                    {isEditingProfile ? (
                      <input 
                        className="w-full px-4 py-2 border border-blue-500 rounded-lg text-sm outline-none"
                        value={editValues.name}
                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm font-bold text-gray-900">{company.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ISIN Identifier</label>
                    {isEditingProfile ? (
                      <input 
                        className="w-full px-4 py-2 border border-blue-500 rounded-lg text-sm outline-none"
                        value={editValues.isin || ''}
                        onChange={(e) => setEditValues({ ...editValues, isin: e.target.value })}
                        placeholder="e.g. US0378331005"
                      />
                    ) : (
                      <p className="text-sm font-bold text-gray-900 font-mono">{company.isin || 'Not set'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reported Property Count</label>
                    {isEditingProfile ? (
                      <input 
                        type="number"
                        className="w-full px-4 py-2 border border-blue-500 rounded-lg text-sm outline-none"
                        value={editValues.reportPropertyCount || ''}
                        onChange={(e) => setEditValues({ ...editValues, reportPropertyCount: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm font-bold text-gray-900">{company.reportPropertyCount || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                    {isEditingProfile ? (
                      <select 
                        className="w-full px-4 py-2 border border-blue-500 rounded-lg text-sm outline-none bg-white"
                        value={editValues.status}
                        onChange={(e) => setEditValues({ ...editValues, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border",
                        company.status === 'active' ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-500 border-gray-100"
                      )}>
                        {company.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Index Visibility</h4>
                      <p className="text-xs text-gray-500">Should this company appear in the public investor index?</p>
                    </div>
                    {isEditingProfile ? (
                      <button 
                        onClick={() => setEditValues({ ...editValues, indexListed: !editValues.indexListed })}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          editValues.indexListed ? "bg-blue-600" : "bg-gray-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                          editValues.indexListed ? "right-1" : "left-1"
                        )} />
                      </button>
                    ) : (
                      <span className={cn(
                        "text-[10px] font-black px-2 py-1 rounded",
                        company.indexListed ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"
                      )}>
                        {company.indexListed ? 'LISTED' : 'HIDDEN'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Snapshot Inclusions</h4>
                      <p className="text-xs text-gray-500">Include this company in point-in-time portfolio snapshots?</p>
                    </div>
                    {isEditingProfile ? (
                      <button 
                        onClick={() => setEditValues({ ...editValues, snapshotsEnabled: !editValues.snapshotsEnabled })}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          editValues.snapshotsEnabled ? "bg-blue-600" : "bg-gray-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                          editValues.snapshotsEnabled ? "right-1" : "left-1"
                        )} />
                      </button>
                    ) : (
                      <span className={cn(
                        "text-[10px] font-black px-2 py-1 rounded",
                        company.snapshotsEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                      )}>
                        {company.snapshotsEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    )}
                  </div>
                </div>

                {isEditingProfile && (
                  <div className="flex items-center space-x-3 pt-6">
                    <button 
                      disabled={isSaving}
                      onClick={handleSaveProfile}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center shadow-lg shadow-blue-200"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                      Save Changes
                    </button>
                    <button 
                      onClick={() => setIsEditingProfile(false)}
                      className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Modal at the bottom */}
      <Modal isOpen={isAddingProperty} onClose={() => setIsAddingProperty(false)} title="Add Property">
        <PropertyForm
          preselectedCompanyId={id}
          onSubmit={handleAddProperty}
          onCancel={() => setIsAddingProperty(false)}
        />
      </Modal>
    </div>
  );
};

export default CompanyDetails;
