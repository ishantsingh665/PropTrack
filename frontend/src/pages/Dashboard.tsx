import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Users, 
  Calendar, 
  Plus,
  ArrowRight,
  Info,
  AlertTriangle,
  Lock,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { 
  getDashboardData, 
  getGateStatus, 
  takeSnapshot, 
  DashboardData, 
  Snapshot 
} from '../api/snapshots';
import { getCompanies } from '../api/companies';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const Dashboard: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [gateStatus, setGateStatus] = useState<{ isOpen: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);

  const fetchInitialData = useCallback(async () => {
    try {
      const [comps, gate] = await Promise.all([
        getCompanies({ limit: 100 }),
        getGateStatus()
      ]);
      setCompanies(comps.data);
      setGateStatus(gate);
      if (comps.data.length > 0) {
        setSelectedCompanyId(comps.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!selectedCompanyId) return;
    setIsLoading(true);
    try {
      const data = await getDashboardData(selectedCompanyId);
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleTakeSnapshot = async () => {
    setIsTakingSnapshot(true);
    try {
      await takeSnapshot();
      const gate = await getGateStatus();
      setGateStatus(gate);
      fetchDashboard();
      alert('Snapshot taken successfully! The snapshot gate is now open for this month.');
    } catch (error) {
      console.error('Snapshot failed:', error);
      alert('Failed to take snapshot.');
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  const trendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500 mr-1" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500 mr-1" />;
    return null;
  };

  const trendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const chartData = dashboardData?.current && dashboardData?.previous ? [
    { name: 'Previous', count: dashboardData.previous.propertyCount, gfa: dashboardData.previous.totalGfaSqft / 1000 },
    { name: 'Current', count: dashboardData.current.propertyCount, gfa: dashboardData.current.totalGfaSqft / 1000 },
  ] : [];

  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Analytics and snapshots for your global property portfolio.</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            className="text-sm border-gray-200 rounded-lg focus:ring-blue-500 text-black min-w-[200px]"
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {gateStatus?.isOpen === false && (
            <button
              onClick={handleTakeSnapshot}
              disabled={isTakingSnapshot}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-orange-700 transition-colors shadow-sm"
            >
              {isTakingSnapshot ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Take Snapshot (Open Gate)
            </button>
          )}
        </div>
      </div>

      {gateStatus?.isOpen === false && (
        <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl flex items-start">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mr-4 flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-orange-900 font-bold">Snapshot Gate Active</h3>
            <p className="text-orange-700 text-sm mt-1 max-w-2xl">
              System modifications (Adding properties, Bulk imports) are blocked until a snapshot is taken for the current month. 
              This ensures your monthly analytics represent a consistent point-in-time state.
            </p>
            <button 
              onClick={handleTakeSnapshot}
              className="mt-4 text-xs font-bold uppercase tracking-wider text-orange-600 hover:text-orange-800"
            >
              Initialize Monthly Snapshot Now &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            {dashboardData?.trends && (
              <div className={cn("flex items-center text-xs font-bold", trendColor(dashboardData.trends.propertyCountDelta))}>
                {trendIcon(dashboardData.trends.propertyCountDelta)}
                {dashboardData.trends.propertyCountDelta > 0 ? '+' : ''}{dashboardData.trends.propertyCountDelta}
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500 mt-4">Total Properties</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {dashboardData?.current?.propertyCount.toLocaleString() || '—'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            {dashboardData?.trends && (
              <div className={cn("flex items-center text-xs font-bold", trendColor(dashboardData.trends.gfaDelta))}>
                {trendIcon(dashboardData.trends.gfaDelta)}
                {dashboardData.trends.gfaDelta > 0 ? '+' : ''}{(dashboardData.trends.gfaDelta / 1000).toFixed(1)}k
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500 mt-4">Total GFA (sqft)</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {dashboardData?.current ? `${(dashboardData.current.totalGfaSqft / 1000000).toFixed(2)}M` : '—'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
              <Users className="w-5 h-5" />
            </div>
            {dashboardData?.trends && (
              <div className={cn("flex items-center text-xs font-bold", trendColor(dashboardData.trends.stakesDelta))}>
                {trendIcon(dashboardData.trends.stakesDelta)}
                {dashboardData.trends.stakesDelta > 0 ? '+' : ''}{dashboardData.trends.stakesDelta}
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500 mt-4">Active Stakes</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {dashboardData?.current?.activeStakeCount.toLocaleString() || '—'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">Property Count Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#F9FAFB' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 1 ? '#3B82F6' : '#E5E7EB'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">Total GFA Trend (k sqft)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="gfa" 
                  stroke="#8B5CF6" 
                  strokeWidth={3} 
                  dot={{ r: 6, fill: '#8B5CF6', strokeWidth: 0 }} 
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Snapshot History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Snapshot Archive</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-100">
                <th className="px-6 py-3">Month</th>
                <th className="px-6 py-3">Properties</th>
                <th className="px-6 py-3">GFA (sqft)</th>
                <th className="px-6 py-3">Stakes</th>
                <th className="px-6 py-3">Captured At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dashboardData?.current && (
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm font-bold text-gray-900">
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      {dashboardData.current.month}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{dashboardData.current.propertyCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{dashboardData.current.totalGfaSqft.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{dashboardData.current.activeStakeCount}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">{format(new Date(dashboardData.current.createdAt), 'MMM d, yyyy HH:mm')}</td>
                </tr>
              )}
              {dashboardData?.previous && (
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm font-medium text-gray-500">
                      <Calendar className="w-4 h-4 mr-2 text-gray-300" />
                      {dashboardData.previous.month}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{dashboardData.previous.propertyCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{dashboardData.previous.totalGfaSqft.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{dashboardData.previous.activeStakeCount}</td>
                  <td className="px-6 py-4 text-xs text-gray-300">{format(new Date(dashboardData.previous.createdAt), 'MMM d, yyyy HH:mm')}</td>
                </tr>
              )}
              {!dashboardData?.current && !dashboardData?.previous && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic text-sm">
                    No snapshot data available for this company.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
