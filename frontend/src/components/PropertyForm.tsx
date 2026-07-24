import React, { useState, useEffect } from 'react';
import { getPropertyTypes } from '../api/propertyTypes';
import { getCompanies } from '../api/companies';

interface PropertyFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  preselectedCompanyId?: string;
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {!initialData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
          <div className="col-span-full">
            <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Ownership & Classification</h4>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Associated Company</label>
            <select
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
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
          <div>
            <label className="block text-sm font-medium text-gray-700">Initial Stake (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.initialOwnershipPct}
              onChange={(e) => setFormData({ ...formData, initialOwnershipPct: e.target.value })}
              disabled={!formData.initialCompanyId}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Level</label>
            <select
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
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
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
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
          {formData.propertyLevel === 'unit' && (
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700">Parent Building ID</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.parentId}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-full">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Location Details</h4>
        </div>
        <div className="col-span-full">
          <label className="block text-sm font-medium text-gray-700">Name (Optional)</label>
          <input
            type="text"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="col-span-full">
          <label className="block text-sm font-medium text-gray-700">Address Line 1 *</label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.addressLine1}
            onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">City *</label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Postal Code</label>
          <input
            type="text"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Country Code *</label>
          <input
            type="text"
            required
            maxLength={2}
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none uppercase"
            value={formData.countryCode}
            onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-full">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Metrics & Coordinates</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">GFA Value</label>
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.gfaInputValue}
              onChange={(e) => setFormData({ ...formData, gfaInputValue: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">GFA Unit</label>
            <select
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
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
            <label className="block text-sm font-medium text-gray-700">Latitude</label>
            <input
              type="number"
              step="0.000001"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Longitude</label>
            <input
              type="number"
              step="0.000001"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
            />
          </div>
        </div>
      </div>

      {initialData && (
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-700 font-bold text-blue-600">Building Log Entry (Optional)</label>
          <textarea
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="What changed? (e.g. Renovated lobby)"
            value={formData.logEntry}
            onChange={(e) => setFormData({ ...formData, logEntry: e.target.value })}
            rows={3}
          />
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Property'}
        </button>
      </div>
    </form>
  );
};

export default PropertyForm;
