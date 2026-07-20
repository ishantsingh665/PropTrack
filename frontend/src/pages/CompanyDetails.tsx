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
  AlertCircle
} from 'lucide-react';
import { getCompany } from '../api/companies';
import { getProperties } from '../api/properties';
import CompanyNotes from '../components/CompanyNotes';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const CompanyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'notes'>('portfolio');

  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [compData, propData] = await Promise.all([
        getCompany(id),
        getProperties({ companyId: id, limit: 100 })
      ]);
      setCompany(compData);
      setPortfolio(propData.data);
    } catch (error) {
      console.error('Failed to fetch company details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border bg-blue-50 text-blue-600 border-blue-100">
                {company.countryCode} Registered
              </span>
            </div>
            <div className="flex items-center text-gray-500 mt-1">
              <Globe className="w-4 h-4 mr-1 text-gray-400" />
              <span className="text-sm font-medium">Reg: {company.registrationNumber || 'Not Provided'}</span>
              <span className="mx-2 text-gray-300">•</span>
              <Calendar className="w-4 h-4 mr-1 text-gray-400" />
              <span className="text-sm font-medium text-gray-400">JOINED {format(new Date(company.createdAt), 'MMM yyyy')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-gray-50 transition-colors shadow-sm">
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
            <Building2 className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">Portfolio Size</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{portfolio.length} Assets</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">Total GFA Managed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalGfa.toLocaleString()} <span className="text-xs font-normal text-gray-400 uppercase">sqft</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
            <Briefcase className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">Global Coverage</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Array.from(new Set(portfolio.map(p => p.countryCode))).length} Countries
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-8 border-b border-gray-200 pt-4">
        {[
          { id: 'portfolio', name: 'Asset Portfolio', icon: Building2 },
          { id: 'notes', name: 'Research & Notes', icon: FileText },
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

      <div>
        {activeTab === 'portfolio' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Live Assets</h3>
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
                          <Link to={`/properties/${prop.id}`} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg inline-block transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </Link>
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
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[600px]">
            <CompanyNotes companyId={company.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDetails;
