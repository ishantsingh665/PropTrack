import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, ChevronRight, ChevronLeft, FileText, Eye } from 'lucide-react';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../api/companies';
import Modal from '../components/Modal';
import CompanyForm from '../components/CompanyForm';
import CompanyNotes from '../components/CompanyNotes';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for cleaner tailwind classes */
function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ after: null, limit: 10 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const fetchCompanies = useCallback(async (after?: string) => {
    setIsLoading(true);
    try {
      const { data, pagination: pag } = await getCompanies({ after, limit: 10, search });
      setCompanies(data);
      setPagination(pag);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCompanies]);

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
    } catch (error) {
      console.error('Operation failed:', error);
      alert('Failed to save company. Check if snapshot gate is open.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this company?')) return;
    try {
      await deleteCompany(id);
      fetchCompanies();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500 mt-1">Manage global company records and ownership entities.</p>
        </div>
        <button
          onClick={() => {
            setEditingCompany(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={isLoading}
              onClick={() => fetchCompanies()}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
            >
              Refresh
            </button>
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

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {companies.length} companies
          </p>
          <div className="flex items-center space-x-2">
            <button
              disabled={isLoading || !pagination.after}
              onClick={() => fetchCompanies(pagination.after || undefined)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
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
