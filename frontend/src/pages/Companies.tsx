import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, ChevronRight, ChevronLeft, FileText, Eye } from 'lucide-react';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../api/companies';
import Modal from '../components/Modal';
import CompanyForm from '../components/CompanyForm';
import CompanyNotes from '../components/CompanyNotes';
import ConfirmationModal from '../components/ConfirmationModal';
import NotificationComponent from '../components/Notification';
import { cn } from '../lib/utils';

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmData, setConfirmData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Search/Filter State
  const [filters, setFilters] = useState({ search: '', name: '', id: '', isin: '' });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchCompanies = useCallback(async (after?: string) => {
    setIsLoading(true);
    try {
      const { data, pagination: pag } = await getCompanies({ 
        after, 
        limit: pageSize, 
        ...debouncedFilters 
      });
      setCompanies(data);
      setNextCursor(pag.nextCursor);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedFilters, pageSize]);

  useEffect(() => {
    setCurrentCursor(undefined);
    setCursorHistory([]);
    setCurrentPage(1);
    fetchCompanies(undefined);
  }, [fetchCompanies]);

  const handleNext = () => {
    if (nextCursor) {
      setCursorHistory([...cursorHistory, currentCursor || '']);
      setCurrentCursor(nextCursor);
      setCurrentPage(p => p + 1);
      fetchCompanies(nextCursor);
    }
  };

  const handlePrev = () => {
    const newHistory = [...cursorHistory];
    const prevCursor = newHistory.pop();
    setCursorHistory(newHistory);
    setCurrentCursor(prevCursor === '' ? undefined : prevCursor);
    setCurrentPage(p => Math.max(p - 1, 1));
    fetchCompanies(prevCursor === '' ? undefined : prevCursor);
  };



  const handleCreateOrUpdate = async (formData: any) => {
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, formData);
      } else {
        await createCompany(formData);
      }
      setIsModalOpen(false);
      setEditingCompany(null);
      fetchCompanies();
      setNotification({ message: 'Company saved successfully.', type: 'success' });
    } catch (error: any) {
      console.error('Operation failed:', error);
      setNotification({ message: 'Failed to save company. Check if snapshot gate is open.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmData({
      isOpen: true,
      title: 'Delete Company',
      message: 'Are you sure you want to delete this company? This action cannot be undone.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteCompany(id);
          fetchCompanies();
          setNotification({ message: 'Company deleted successfully.', type: 'success' });
        } catch (error) {
          console.error('Delete failed:', error);
          setNotification({ message: 'Failed to delete company.', type: 'error' });
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {notification && (
        <NotificationComponent 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}
      
      <ConfirmationModal
        isOpen={confirmData.isOpen}
        onClose={() => setConfirmData({ ...confirmData, isOpen: false })}
        onConfirm={confirmData.onConfirm}
        title={confirmData.title}
        message={confirmData.message}
        isDestructive={confirmData.isDestructive}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">Companies</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage global company records and ownership entities.</p>
        </div>
        <button
          onClick={() => {
            setEditingCompany(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <input
              type="text"
              placeholder="Filter by Name..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              value={filters.name}
              onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Filter by ID..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              value={filters.id}
              onChange={(e) => setFilters(prev => ({ ...prev, id: e.target.value }))}
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by ISIN..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                value={filters.isin}
                onChange={(e) => setFilters(prev => ({ ...prev, isin: e.target.value }))}
              />
              <button
                onClick={() => setFilters({ search: '', name: '', id: '', isin: '' })}
                className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">Reg Number</th>
                <th className="px-6 py-4">Country</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <Link to={`/companies/${company.id}`} className="font-bold text-gray-900 hover:text-blue-600 transition-colors">
                      {company.name}
                    </Link>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{company.id}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {company.registrationNumber || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-[10px] font-bold bg-blue-50 text-blue-700 rounded uppercase border border-blue-100">
                      {company.countryCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        to={`/companies/${company.id}`}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View Portfolio"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setSelectedCompanyId(company.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Research Notes"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCompany(company);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No companies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{companies.length}</span> companies
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-sm text-gray-500">
                Per page:
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1 px-2 border"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 mr-2">Page {currentPage}</span>
            <button
              onClick={handlePrev}
              disabled={isLoading || cursorHistory.length === 0}
              className="px-3 py-1 text-sm font-medium border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={isLoading || !nextCursor}
              className="px-3 py-1 text-sm font-medium border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCompany(null);
        }}
        title={editingCompany ? 'Edit Company' : 'Add New Company'}
      >
        <CompanyForm
          initialData={editingCompany}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingCompany(null);
          }}
        />
      </Modal>

      {/* Side Panel for Notes */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 border-l border-gray-200",
        selectedCompanyId ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedCompanyId && (
          <CompanyNotes 
            companyId={selectedCompanyId} 
            onClose={() => setSelectedCompanyId(null)} 
          />
        )}
      </div>

      {/* Overlay */}
      {selectedCompanyId && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setSelectedCompanyId(null)}
        />
      )}
    </div>
  );
};

export default Companies;
