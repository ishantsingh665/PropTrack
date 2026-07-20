import React, { useState, useEffect } from 'react';

interface CompanyFormProps {
  initialData?: {
    name: string;
    registrationNumber?: string;
    countryCode: string;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const CompanyForm: React.FC<CompanyFormProps> = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    registrationNumber: initialData?.registrationNumber || '',
    countryCode: initialData?.countryCode || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Company Name *</label>
        <input
          type="text"
          required
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Registration Number</label>
        <input
          type="text"
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
          value={formData.registrationNumber}
          onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Country Code (ISO 2-letter) *</label>
        <input
          type="text"
          required
          maxLength={2}
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black uppercase"
          value={formData.countryCode}
          onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
        />
      </div>
      <div className="flex justify-end space-x-3 mt-6">
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
          {isLoading ? 'Saving...' : 'Save Company'}
        </button>
      </div>
    </form>
  );
};

export default CompanyForm;
