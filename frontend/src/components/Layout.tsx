import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  ArrowLeftRight, 
  Copy, 
  Camera,
  FileText, 
  LayoutDashboard, 
  LogOut,
  Search,
  Plus,
  Upload,
  Settings2,
  Loader2,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Menu
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

  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    { name: 'Snapshots', path: '/snapshots', icon: Camera },
    { name: 'Bulk Import', path: '/import', icon: Upload },
    { name: 'Audit Log', path: '/audit', icon: FileText },
    { name: 'Property Types', path: '/settings/types', icon: Settings2 },
    { name: 'Users', path: '/settings/users', icon: Users },
    { name: 'Geocoding', path: '/settings/geocoding', icon: MapPin },
  ];

  const getHeaderActionLabel = () => {
    if (location.pathname.startsWith('/companies/')) return 'Add Property';
    if (location.pathname.startsWith('/companies')) return 'Add Company';
    if (location.pathname.startsWith('/properties')) return 'Add Property';
    if (location.pathname.startsWith('/transfers')) return 'Record Transfer';
    return 'Add New';
  };

  const handleHeaderAction = () => {
    if (location.pathname.startsWith('/import')) return; 
    setIsHeaderModalOpen(true);
  };

  const showHeaderAction = () => {
    const hiddenPaths = ['/', '/import', '/audit', '/snapshots'];
    if (hiddenPaths.includes(location.pathname)) return false;
    if (location.pathname.startsWith('/settings')) return false;
    if (location.pathname.startsWith('/snapshots/')) return false;
    return true;
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out relative",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 bg-slate-800 text-slate-300 p-1.5 rounded-full border border-slate-700 hover:text-white transition-colors z-50 shadow-lg"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={cn("p-6 overflow-hidden", isSidebarCollapsed && "px-4")}>
          {!isSidebarCollapsed ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-blue-400 truncate">PropTrack</h1>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold truncate">Global Management</p>
            </>
          ) : (
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl mx-auto shadow-inner">
              P
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                title={isSidebarCollapsed ? item.name : ""}
                className={cn(
                  "flex items-center py-3 text-sm font-medium rounded-lg transition-all duration-200 group",
                  isSidebarCollapsed ? "px-0 justify-center" : "px-4",
                  isActive 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", !isSidebarCollapsed && "mr-3")} />
                {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            title={isSidebarCollapsed ? "Logout" : ""}
            className={cn(
              "flex items-center w-full py-3 text-sm font-medium text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white transition-all group",
              isSidebarCollapsed ? "px-0 justify-center" : "px-4"
            )}
          >
            <LogOut className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1", !isSidebarCollapsed && "mr-3")} />
            {!isSidebarCollapsed && <span className="truncate">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 sticky top-0 z-20 flex-shrink-0 shadow-sm">
          <div className="relative w-96 max-w-full">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search properties, companies..." 
                className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
            {/* Search Results logic remains the same */}
            {isSearchFocused && searchQuery.length >= 2 && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-2xl rounded-xl overflow-hidden z-30 max-h-[400px] overflow-y-auto">
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
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center mr-3 flex-shrink-0">
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
                          <div className="w-8 h-8 bg-slate-900 text-white rounded flex items-center justify-center mr-3 flex-shrink-0">
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
          
          <div className="flex items-center space-x-4">
            {showHeaderAction() && (
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

        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Context-Aware Modals */}
      <Modal
        isOpen={isHeaderModalOpen}
        onClose={() => setIsHeaderModalOpen(false)}
        title={getHeaderActionLabel()}
      >
        {location.pathname.startsWith('/properties') && (
          <PropertyForm 
            onSubmit={async (data) => {
              const { createProperty } = await import('../api/properties');
              await createProperty(data);
              setIsHeaderModalOpen(false); 
              window.location.reload(); 
            }} 
            onCancel={() => setIsHeaderModalOpen(false)} 
          />
        )}
        {location.pathname.startsWith('/companies/') && (
          <PropertyForm 
            preselectedCompanyId={location.pathname.split('/')[2]}
            onSubmit={async (data) => {
              const { createProperty } = await import('../api/properties');
              await createProperty(data);
              setIsHeaderModalOpen(false); 
              window.location.reload(); 
            }} 
            onCancel={() => setIsHeaderModalOpen(false)} 
          />
        )}
        {location.pathname.startsWith('/companies') && !location.pathname.includes('/', 11) && (
          <CompanyForm 
            onSubmit={async () => { setIsHeaderModalOpen(false); window.location.reload(); }} 
            onCancel={() => setIsHeaderModalOpen(false)} 
          />
        )}
        {location.pathname.startsWith('/transfers') && (
          <TransferForm 
            onSubmit={async () => { setIsHeaderModalOpen(false); window.location.reload(); }} 
            onCancel={() => setIsHeaderModalOpen(false)} 
          />
        )}
      </Modal>
    </div>
  );
};

export default Layout;
