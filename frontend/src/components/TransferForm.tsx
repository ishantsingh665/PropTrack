import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, ArrowRight, Info } from 'lucide-react';
import { getProperties, getProperty } from '../api/properties';
import { getCompanies } from '../api/companies';
import { TransferLeg } from '../api/transfers';

interface TransferFormProps {
  onSubmit: (data: { type: 'transfer' | 'swap'; legs: TransferLeg[]; notes?: string }) => Promise<void>;
  onCancel: () => void;
}

const TransferForm: React.FC<TransferFormProps> = ({ onSubmit, onCancel }) => {
  const [type, setType] = useState<'transfer' | 'swap'>('transfer');
  const [legs, setLegs] = useState<TransferLeg[]>([
    { propertyId: '', sourceCompanyId: '', targetCompanyId: '', ownershipPct: 100 }
  ]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For property search
  const [propSearch, setPropSearch] = useState<string[]>(['']);
  const [propResults, setPropResults] = useState<any[][]>([[]]);
  
  // For target company search
  const [targetSearch, setTargetSearch] = useState<string[]>(['']);
  const [targetResults, setTargetResults] = useState<any[][]>([[]]);

  // Current owners for each leg
  const [currentOwners, setCurrentOwners] = useState<any[][]>([[]]);

  const handleAddLeg = () => {
    setLegs([...legs, { propertyId: '', sourceCompanyId: '', targetCompanyId: '', ownershipPct: 100 }]);
    setPropSearch([...propSearch, '']);
    setPropResults([...propResults, []]);
    setTargetSearch([...targetSearch, '']);
    setTargetResults([...targetResults, []]);
    setCurrentOwners([...currentOwners, []]);
  };

  const handleRemoveLeg = (index: number) => {
    if (legs.length === 1) return;
    setLegs(legs.filter((_, i) => i !== index));
    setPropSearch(propSearch.filter((_, i) => i !== index));
    setPropResults(propResults.filter((_, i) => i !== index));
    setTargetSearch(targetSearch.filter((_, i) => i !== index));
    setTargetResults(targetResults.filter((_, i) => i !== index));
    setCurrentOwners(currentOwners.filter((_, i) => i !== index));
  };

  const searchProperties = async (index: number, query: string) => {
    const newSearch = [...propSearch];
    newSearch[index] = query;
    setPropSearch(newSearch);

    if (query.length < 2) {
      const newResults = [...propResults];
      newResults[index] = [];
      setPropResults(newResults);
      return;
    }

    try {
      const { data } = await getProperties({ search: query, limit: 5 });
      const newResults = [...propResults];
      newResults[index] = data;
      setPropResults(newResults);
    } catch (error) {
      console.error('Property search failed:', error);
    }
  };

  const selectProperty = async (index: number, property: any) => {
    const newLegs = [...legs];
    newLegs[index].propertyId = property.id;
    newLegs[index].sourceCompanyId = ''; // Reset source company
    setLegs(newLegs);

    const newSearch = [...propSearch];
    newSearch[index] = property.name;
    setPropSearch(newSearch);

    const newResults = [...propResults];
    newResults[index] = [];
    setPropResults(newResults);

    // Fetch current owners
    try {
      const fullProp = await getProperty(property.id);
      const newOwners = [...currentOwners];
      newOwners[index] = fullProp.companies.filter((c: any) => !c.validTo);
      setCurrentOwners(newOwners);
    } catch (error) {
      console.error('Failed to fetch owners:', error);
    }
  };

  const searchCompanies = async (index: number, query: string) => {
    const newSearch = [...targetSearch];
    newSearch[index] = query;
    setTargetSearch(newSearch);

    if (query.length < 2) {
      const newResults = [...targetResults];
      newResults[index] = [];
      setTargetResults(newResults);
      return;
    }

    try {
      const { data } = await getCompanies({ search: query, limit: 5 });
      const newResults = [...targetResults];
      newResults[index] = data;
      setTargetResults(newResults);
    } catch (error) {
      console.error('Company search failed:', error);
    }
  };

  const selectTargetCompany = (index: number, company: any) => {
    const newLegs = [...legs];
    newLegs[index].targetCompanyId = company.id;
    setLegs(newLegs);

    const newSearch = [...targetSearch];
    newSearch[index] = company.name;
    setTargetSearch(newSearch);

    const newResults = [...targetResults];
    newResults[index] = [];
    setTargetResults(newResults);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ type, legs, notes });
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-black">
      <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setType('transfer')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            type === 'transfer' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Transfer
        </button>
        <button
          type="button"
          onClick={() => setType('swap')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            type === 'swap' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Swap
        </button>
      </div>

      <div className="space-y-4">
        {legs.map((leg, index) => (
          <div key={index} className="relative p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {type === 'swap' ? `Leg ${index + 1}` : 'Movement'}
              </span>
              {legs.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveLeg(index)}
                  className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Property Search */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1">Property</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Search property name..."
                    value={propSearch[index]}
                    onChange={(e) => searchProperties(index, e.target.value)}
                  />
                </div>
                {propResults[index].length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {propResults[index].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        onClick={() => selectProperty(index, p)}
                      >
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.addressLine1}, {p.city}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ownership % */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ownership % to Transfer</label>
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={leg.ownershipPct}
                  onChange={(e) => {
                    const newLegs = [...legs];
                    newLegs[index].ownershipPct = parseFloat(e.target.value);
                    setLegs(newLegs);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Source Company (from current owners) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Source Company (Seller)</label>
                <select
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={leg.sourceCompanyId}
                  onChange={(e) => {
                    const newLegs = [...legs];
                    newLegs[index].sourceCompanyId = e.target.value;
                    setLegs(newLegs);
                  }}
                  disabled={!leg.propertyId}
                >
                  <option value="">Select current owner...</option>
                  {currentOwners[index].map((stake) => (
                    <option key={stake.company.id} value={stake.company.id}>
                      {stake.company.name} ({stake.ownershipPct}%)
                    </option>
                  ))}
                </select>
                {!leg.propertyId && (
                  <p className="mt-1 text-[10px] text-gray-400 flex items-center">
                    <Info className="w-3 h-3 mr-1" /> Search property first
                  </p>
                )}
              </div>

              {/* Target Company */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1">Target Company (Buyer)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Search buyer..."
                    value={targetSearch[index]}
                    onChange={(e) => searchCompanies(index, e.target.value)}
                  />
                </div>
                {targetResults[index].length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {targetResults[index].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        onClick={() => selectTargetCompany(index, c)}
                      >
                        <div className="font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-400">{c.countryCode} {c.registrationNumber}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {type === 'swap' && (
          <button
            type="button"
            onClick={handleAddLeg}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center font-medium text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Swap Leg
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
        <textarea
          rows={3}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Reason for transfer, deed reference, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || legs.some(l => !l.propertyId || !l.sourceCompanyId || !l.targetCompanyId)}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Recording...' : type === 'swap' ? 'Execute Swap' : 'Complete Transfer'}
        </button>
      </div>
    </form>
  );
};

export default TransferForm;
