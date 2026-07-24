import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, ChevronRight, Filter, MapPin, Building2, Eye } from 'lucide-react';
import { getProperties, createProperty, updateProperty, deleteProperty } from '../api/properties';
import { getCompanies } from '../api/companies';
import { getPropertyTypes } from '../api/propertyTypes';
import Modal from '../components/Modal';
import PropertyForm from '../components/PropertyForm';
import Notification from '../components/Notification';
import { cn } from '../lib/utils';

const Properties: React.FC = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [after, setAfter] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Filters
  const [companies, setCompanies] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    companyId: '',
    status: '',
    countryCode: '',
    typeId: '',
  });

  const fetchFilters = useCallback(async () => {
    try {
      const [companiesRes, typesRes] = await Promise.all([
        getCompanies({ limit: 100 }),
        getPropertyTypes()
      ]);
      setCompanies(companiesRes.data);
      setTypes(typesRes);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    }
  }, []);

  const fetchProperties = useCallback(async (newAfter?: string) => {
    setIsLoading(true);
    try {
      const { data, pagination: pag } = await getProperties({ 
        after: newAfter, 
        limit: pageSize, 
        ...filters 
      });
      setProperties(data);
      setAfter(pag.after);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pageSize]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setCursorStack([]);
    fetchProperties(undefined);
  }, [filters, pageSize, fetchProperties]);

  const handleNext = () => {
    setCursorStack([...cursorStack, after!]);
    setCurrentPage(prev => prev + 1);
    fetchProperties(after);
  };

  const handlePrev = () => {
    const newStack = [...cursorStack];
    const prevCursor = newStack.pop();
    setCursorStack(newStack);
    setCurrentPage(prev => Math.max(prev - 1, 1));
    fetchProperties(prevCursor);
  };
const handleCreateOrUpdate = async (formData: any) => {
  console.log('Submitting form data:', formData); // debug log
  setIsLoading(true);
  try {
    if (editingProperty) {
      await updateProperty(editingProperty.id, formData);
    } else {
      await createProperty(formData);
    }
    setIsModalOpen(false);
    setEditingProperty(null);
    fetchProperties();
    setNotification({ message: 'Property saved successfully.', type: 'success' });
  } catch (error: any) {
    console.error('Operation failed:', error);
    const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
    setNotification({ message: `Failed to save property: ${errorMessage}`, type: 'error' });
  } finally {
    setIsLoading(false);
  }
};

const handleDelete = async (id: string) => {
  if (!window.confirm('Are you sure you want to delete this property?')) return;
  try {
    await deleteProperty(id);
    fetchProperties();
    setNotification({ message: 'Property deleted successfully.', type: 'success' });
  } catch (error: any) {
    console.error('Delete failed:', error);
    const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
    setNotification({ message: `Failed to delete property: ${errorMessage}`, type: 'error' });
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'sold': return 'bg-gray-100 text-gray-700';
    case 'transferred': return 'bg-blue-100 text-blue-700';
    case 'reversed': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};
  return (
    <div className="space-y-6">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">Manage buildings, units, and global portfolio assets.</p>
        </div>
        <button
          onClick={() => {
            setEditingProperty(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Company</label>
          <select 
            className="w-full text-sm border-gray-200 rounded-lg focus:ring-blue-500 text-black"
            value={filters.companyId}
            onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
          >
            <option value="">All Companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
          <select 
            className="w-full text-sm border-gray-200 rounded-lg focus:ring-blue-500 text-black"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="sold">Sold</option>
            <option value="transferred">Transferred</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Country</label>
          <input 
            type="text" 
            placeholder="e.g. SE"
            maxLength={2}
            className="w-full text-sm border-gray-200 rounded-lg focus:ring-blue-500 text-black uppercase"
            value={filters.countryCode}
            onChange={(e) => setFilters({ ...filters, countryCode: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Type</label>
          <select 
            className="w-full text-sm border-gray-200 rounded-lg focus:ring-blue-500 text-black"
            value={filters.typeId}
            onChange={(e) => setFilters({ ...filters, typeId: e.target.value })}
          >
            <option value="">All Types</option>
            {types.map(parent => (
              <optgroup key={parent.id} label={parent.name}>
                {parent.children?.map((child: any) => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
                <th className="px-6 py-4">Property</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">GFA (sqft)</th>
                <th className="px-6 py-4">Current Owners</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {properties.map((prop) => (
                <tr key={prop.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center mr-3",
                        prop.propertyLevel === 'building' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                      )}>
                        {prop.propertyLevel === 'building' ? <Building2 className="w-4 h-4" /> : <div className="text-[10px] font-bold">U</div>}
                      </div>
                      <div>
                        <Link to={`/properties/${prop.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {prop.name || prop.addressLine1}
                        </Link>
                        <div className="text-xs text-gray-400 flex items-center mt-0.5">
                          <MapPin className="w-3 h-3 mr-1" />
                          {prop.city}, {prop.countryCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {prop.type?.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {prop.gfaSqft?.toLocaleString() || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {prop.companies?.map((stake: any) => (
                        <div key={stake.id} className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold flex items-center",
                          getStatusColor(stake.status)
                        )}>
                          {stake.company.name} ({stake.ownershipPct}%)
                        </div>
                      ))}
                      {(!prop.companies || prop.companies.length === 0) && (
                        <span className="text-xs text-gray-400 italic font-medium">No active owners</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        to={`/properties/${prop.id}`}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => {
                          setEditingProperty(prop);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(prop.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {properties.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No properties found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{properties.length}</span> properties
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
              disabled={isLoading || currentPage === 1}
              className="px-3 py-1 text-sm font-medium border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={isLoading || !after}
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
          setEditingProperty(null);
        }}
        title={editingProperty ? 'Edit Property' : 'Add New Property'}
      >
        <PropertyForm
          initialData={editingProperty}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingProperty(null);
          }}
        />
      </Modal>
    </div>
  );
};

export default Properties;
