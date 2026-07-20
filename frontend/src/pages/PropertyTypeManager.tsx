import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Settings2, 
  ChevronDown, 
  ChevronRight, 
  ToggleLeft, 
  ToggleRight,
  AlertCircle,
  Loader2,
  FolderTree,
  Building2,
  Trash2,
  Edit2
} from 'lucide-react';
import { 
  getPropertyTypes, 
  createPropertyType, 
  togglePropertyTypeActive,
  PropertyType 
} from '../api/propertyTypes';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const PropertyTypeManager: React.FC = () => {
  const [types, setTypes] = useState<PropertyType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [isAddingTo, setIsAddingTo] = useState<string | null>(null); // parentId or 'root'
  const [newName, setNewNoteName] = useState('');

  const fetchTypes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPropertyTypes();
      setTypes(data);
      // Auto-expand all parents by default
      setExpandedParents(new Set(data.map(t => t.id)));
    } catch (error: any) {
      console.error('Failed to fetch property types:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedParents);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedParents(newSet);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !isAddingTo) return;

    try {
      await createPropertyType({ 
        name: newName, 
        parentId: isAddingTo === 'root' ? undefined : isAddingTo 
      });
      setNewNoteName('');
      setIsAddingTo(null);
      fetchTypes();
    } catch (error) {
      alert('Failed to create property type. Admin role required.');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await togglePropertyTypeActive(id);
      fetchTypes();
    } catch (error) {
      alert('Failed to update status.');
    }
  };

  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Type Hierarchy</h1>
          <p className="text-sm text-gray-500 mt-1">Manage global classification categories and child types.</p>
        </div>
        <button
          onClick={() => setIsAddingTo('root')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Root Category
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 grid grid-cols-12 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
          <div className="col-span-8 px-4">Classification Name</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-right px-4">Actions</div>
        </div>

        {isAddingTo === 'root' && (
          <form onSubmit={handleCreate} className="p-4 border-b border-blue-50 bg-blue-50/30 flex items-center space-x-4">
            <div className="flex-1">
              <input
                autoFocus
                className="w-full text-sm font-bold border-gray-200 rounded-lg focus:ring-blue-500 py-1.5"
                placeholder="New Category Name (e.g. Mixed-use)..."
                value={newName}
                onChange={(e) => setNewNoteName(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <button type="button" onClick={() => setIsAddingTo(null)} className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase">Cancel</button>
              <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase">Save</button>
            </div>
          </form>
        )}

        <div className="divide-y divide-gray-50">
          {types.map((parent) => (
            <div key={parent.id} className="group">
              {/* Parent Row */}
              <div className="grid grid-cols-12 items-center py-4 hover:bg-gray-50 transition-colors">
                <div className="col-span-8 flex items-center px-4">
                  <button 
                    onClick={() => toggleExpand(parent.id)}
                    className="p-1 hover:bg-gray-200 rounded mr-2 text-gray-400 transition-colors"
                  >
                    {expandedParents.has(parent.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <FolderTree className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-gray-900">{parent.name}</span>
                  {!parent.isActive && (
                    <span className="ml-3 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-gray-100 text-gray-400 border border-gray-200">Deactivated</span>
                  )}
                </div>
                <div className="col-span-2 flex justify-center">
                  <button 
                    onClick={() => handleToggleActive(parent.id)}
                    className={cn(
                      "flex items-center transition-colors",
                      parent.isActive ? "text-green-500" : "text-gray-300"
                    )}
                  >
                    {parent.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                </div>
                <div className="col-span-2 text-right px-4 flex justify-end space-x-1">
                  <button 
                    onClick={() => setIsAddingTo(parent.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Add Sub-type"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Children */}
              {expandedParents.has(parent.id) && (
                <div className="bg-gray-50/50 divide-y divide-gray-50">
                  {isAddingTo === parent.id && (
                    <form onSubmit={handleCreate} className="grid grid-cols-12 items-center py-3 px-4 border-l-4 border-blue-400 bg-blue-50/30">
                      <div className="col-span-8 flex items-center pl-10">
                        <input
                          autoFocus
                          className="w-full text-sm font-medium border-gray-200 rounded-lg focus:ring-blue-500 py-1"
                          placeholder="New Sub-type (e.g. Office)..."
                          value={newName}
                          onChange={(e) => setNewNoteName(e.target.value)}
                        />
                      </div>
                      <div className="col-span-4 text-right flex items-center justify-end space-x-3">
                        <button type="button" onClick={() => setIsAddingTo(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase">Add</button>
                      </div>
                    </form>
                  )}
                  {parent.children?.map((child) => (
                    <div key={child.id} className="grid grid-cols-12 items-center py-3 hover:bg-gray-100 transition-colors">
                      <div className="col-span-8 flex items-center px-4 pl-12 border-l-4 border-transparent hover:border-blue-200">
                        <div className="w-6 h-6 bg-white border border-gray-100 text-gray-400 rounded flex items-center justify-center mr-3">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <span className={cn("text-sm font-medium", child.isActive ? "text-gray-700" : "text-gray-400 line-through")}>
                          {child.name}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <button 
                          onClick={() => handleToggleActive(child.id)}
                          className={cn(
                            "flex items-center transition-colors",
                            child.isActive ? "text-green-500" : "text-gray-300"
                          )}
                        >
                          {child.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                      </div>
                      <div className="col-span-2 text-right px-4 flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 text-gray-300 hover:text-gray-600 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!parent.children || parent.children.length === 0) && isAddingTo !== parent.id && (
                    <div className="py-4 pl-16 text-xs text-gray-400 italic">No sub-types defined for this category.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mr-4 flex-shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-blue-900 font-bold text-sm">System Guidance</h3>
          <p className="text-blue-700 text-xs mt-1 leading-relaxed">
            Property types are critical for data consistency across the portfolio. 
            Instead of deleting types (which would orphan existing property records), 
            use the <strong>Active Toggle</strong> to hide them from new property selection menus.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PropertyTypeManager;
