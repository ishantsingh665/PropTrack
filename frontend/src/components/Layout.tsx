import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  ArrowLeftRight, 
  Copy, 
  FileText, 
  LayoutDashboard, 
  LogOut,
  Search,
  Plus,
  Upload,
  Settings2,
  Loader2,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { globalSearch, SearchResults } from '../api/search';
import CompanyForm from './CompanyForm';
import PropertyForm from './PropertyForm';
import TransferForm from './TransferForm';
import Modal from './Modal';
import { cn } from '../lib/utils';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Modal States
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await globalSearch(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Global search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Companies', path: '/companies', icon: Users },
    { name: 'Properties', path: '/properties', icon: Building2 },
    { name: 'Transfers', path: '/transfers', icon: ArrowLeftRight },
    { name: 'Duplicates', path: '/duplicates', icon: Copy },
    { name: 'Bulk Import', path: '/import', icon: Upload },
    { name: 'Audit Log', path: '/audit', icon: FileText },
    { name: 'Property Types', path: '/settings/types', icon: Settings2 },
    { name: 'Users', path: '/settings/users', icon: Users },
    { name: 'Geocoding', path: '/settings/geocoding', icon: MapPin },
  ];

  const getHeaderActionLabel = () => {
    if (location.pathname.startsWith('/companies')) return 'Add Company';
    if (location.pathname.startsWith('/properties')) return 'Add Property';
    if (location.pathname.startsWith('/transfers')) return 'Record Transfer';
    return 'Add New';
  };

  const handleHeaderAction = () => {
    if (location.pathname.startsWith('/import')) return; 
    setIsHeaderModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-blue-400">PropTrack</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Global Management</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  isActive 
                    ? "bg-blue-600 text-white" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="relative w-96">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search properties, companies..." 
                className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-black"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Search Results Dropdown */}
            {isSearchFocused && searchQuery.length >= 2 && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-2xl rounded-xl overflow-hidden z-30 max-h-[400px] overflow-y-auto">
                {/* Properties Section */}
                <div className="p-2">
                  <div className="px-3 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 rounded-lg">Properties</div>
                  {searchResults.properties.length > 0 ? (
                    searchResults.properties.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          navigate(`/properties/${p.id}`);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg group transition-colors mt-1"
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center mr-3">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-gray-900 truncate">{p.name || p.addressLine1}</div>
                            <div className="text-[10px] text-gray-400 flex items-center">
                              <MapPin className="w-2.5 h-2.5 mr-1" />
                              {p.city}, {p.countryCode}
                            </div>
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 ml-2" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-xs text-gray-400 italic">No properties found.</div>
                  )}
                </div>

                {/* Companies Section */}
                <div className="p-2 border-t border-gray-50">
                  <div className="px-3 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 rounded-lg">Companies</div>
                  {searchResults.companies.length > 0 ? (
                    searchResults.companies.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          navigate('/companies');
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg group transition-colors mt-1"
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-slate-900 text-white rounded flex items-center justify-center mr-3">
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-gray-900 truncate">{c.name}</div>
                            <div className="text-[10px] text-gray-400">{c.countryCode} Registration</div>
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 ml-2" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-xs text-gray-400 italic">No companies found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-y-0 space-x-4">
            {location.pathname !== '/' && location.pathname !== '/import' && location.pathname !== '/audit' && !location.pathname.startsWith('/settings') && (
              <button 
                onClick={handleHeaderAction}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                {getHeaderActionLabel()}
              </button>
            )}
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>

      {/* Context-Aware Modals */}
      <Modal
        isOpen={isHeaderModalOpen}
        onClose={() => setIsHeaderModalOpen(false)}
        title={getHeaderActionLabel()}
      >
        {location.pathname.startsWith('/companies') && (
          <CompanyForm 
            onSubmit={() => { setIsHeaderModalOpen(false); window.location.reload(); }} 
            onCancel={() => setIsHeaderModalOpen(false)} 
          />
        )}
        {location.pathname.startsWith('/properties') && (
          <PropertyForm 
            onSubmit={() => { setIsHeaderModalOpen(false); window.location.reload(); }} 
            onCancel={() => setIsHeaderModalOpen(false)} 
          />
        )}
        {location.pathname.startsWith('/transfers') && (
          <TransferForm 
            onSubmit={() => { setIsHeaderModalOpen(false); window.location.reload(); }} 
            onCancel={() => setIsHeaderModalOpen(false)} 
          />
        )}
      </Modal>
    </div>
  );
};

export default Layout;
