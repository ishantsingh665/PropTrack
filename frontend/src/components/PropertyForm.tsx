import React, { useState, useEffect } from 'react';
import { getPropertyTypes } from '../api/propertyTypes';
import { getCompanies } from '../api/companies';

interface PropertyFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  preselectedCompanyId?: string; // Add this prop
}

const PropertyForm: React.FC<PropertyFormProps> = ({ initialData, onSubmit, onCancel, isLoading, preselectedCompanyId }) => {
  const [types, setTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    parentId: initialData?.parentId || '',
    propertyLevel: initialData?.propertyLevel || 'building',
    propertyTypeId: initialData?.propertyTypeId || '',
    name: initialData?.name || '',
    addressLine1: initialData?.addressLine1 || '',
    addressLatin: initialData?.addressLatin || '',
    city: initialData?.city || '',
    postalCode: initialData?.postalCode || '',
    countryCode: initialData?.countryCode || '',
    gfaInputValue: initialData?.gfaInputValue || '',
    gfaInputUnit: initialData?.gfaInputUnit || 'sqft',
    latitude: initialData?.latitude || '',
    longitude: initialData?.longitude || '',
    logEntry: '',
    initialCompanyId: preselectedCompanyId || '',
    initialOwnershipPct: '100',
  });

  useEffect(() => {
    Promise.all([
      getPropertyTypes(),
      getCompanies({ limit: 200 })
    ]).then(([typesData, compsData]) => {
      setTypes(typesData);
      setCompanies(compsData.data);
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData };
    if (!data.parentId) delete (data as any).parentId;
    if (!data.latitude) delete (data as any).latitude;
    if (!data.longitude) delete (data as any).longitude;
    if (!data.name) delete (data as any).name;
    if (!data.postalCode) delete (data as any).postalCode;
    
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      {!initialData && (
        <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider">Associated Company</label>
            <select
              className="w-full px-3 py-2 mt-1 border border-blue-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.initialCompanyId}
              onChange={(e) => setFormData({ ...formData, initialCompanyId: e.target.value })}
              disabled={!!preselectedCompanyId}
            >
              <option value="">Select Company (Optional)</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider">Initial Stake (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="w-full px-3 py-2 mt-1 border border-blue-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.initialOwnershipPct}
              onChange={(e) => setFormData({ ...formData, initialOwnershipPct: e.target.value })}
              disabled={!formData.initialCompanyId}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Level</label>
          <select
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black"
            value={formData.propertyLevel}
            onChange={(e) => setFormData({ ...formData, propertyLevel: e.target.value })}
          >
            <option value="building">Building</option>
            <option value="unit">Unit</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            required
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black"
            value={formData.propertyTypeId}
            onChange={(e) => setFormData({ ...formData, propertyTypeId: e.target.value })}
          >
            <option value="">Select Type</option>
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

      {formData.propertyLevel === 'unit' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Parent Building ID</label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black"
            value={formData.parentId}
            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Name (Optional)</label>
        <input
          type="text"
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Address Line 1 *</label>
        <input
          type="text"
          required
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black"
          value={formData.addressLine1}
          onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">City *</label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Country Code (e.g. SE) *</label>
          <input
            type="text"
            required
            maxLength={2}
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black uppercase"
            value={formData.countryCode}
            onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">GFA Value</label>
          <input
            type="number"
            step="0.01"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black"
            value={formData.gfaInputValue}
            onChange={(e) => setFormData({ ...formData, gfaInputValue: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">GFA Unit</label>
          <select
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black"
            value={formData.gfaInputUnit}
            onChange={(e) => setFormData({ ...formData, gfaInputUnit: e.target.value })}
          >
            <option value="sqft">sqft</option>
            <option value="sqm">sqm</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Latitude (Manual)</label>
          <input
            type="number"
            step="0.000001"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black"
            value={formData.latitude}
            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Longitude (Manual)</label>
          <input
            type="number"
            step="0.000001"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black"
            value={formData.longitude}
            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
          />
        </div>
      </div>

      {initialData && (
        <div>
          <label className="block text-sm font-medium text-gray-700 font-bold text-blue-600">Building Log Entry (Optional)</label>
          <textarea
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black"
            placeholder="What changed? (e.g. Renovated lobby)"
            value={formData.logEntry}
            onChange={(e) => setFormData({ ...formData, logEntry: e.target.value })}
          />
        </div>
      )}

      <div className="flex justify-end space-x-3 mt-6 pb-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Property'}
        </button>
      </div>
    </form>
  );
};

export default PropertyForm;
