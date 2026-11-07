import React, { useState } from 'react';
import {
  Check,
  Edit2,
  FolderGit2,
  PlusCircle,
  Power,
  Search,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Category, Priority } from '../../types';

export const CategoryMappingView: React.FC = () => {
  const {
    categories,
    departments,
    updateCategoryMapping,
    toggleCategoryActive,
    addCategory,
  } = useApp();

  const [search, setSearch] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New category form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || '');
  const [newPriority, setNewPriority] = useState<Priority>('MEDIUM');

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.departmentName.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setSelectedDeptId(cat.departmentId);
  };

  const handleSaveEdit = (categoryId: string) => {
    updateCategoryMapping(categoryId, selectedDeptId);
    setEditingCatId(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    addCategory({
      name: newName,
      description: newDesc,
      departmentId: newDeptId,
      isActive: true,
      defaultPriority: newPriority,
      icon: 'HelpCircle',
    });

    setIsAddModalOpen(false);
    setNewName('');
    setNewDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Automated Routing Matrix
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              FR-05 Compliant
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Category-to-Department Mappings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            When complaints are submitted, the automated dispatch engine routes them instantly according to this matrix.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900">
          <span className="font-bold">Dynamic Routing Rules Active:</span>
          <p className="text-blue-800 mt-0.5 leading-relaxed">
            Every category configured below maps directly to an active campus department. If a category is
            deactivated, new submissions remain flagged as <strong className="font-bold">NEW</strong> for
            manual administrator dispatch. Historical complaint records retain their full audit trail.
          </p>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="relative max-w-xs flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search category or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {filteredCategories.length} Categories configured
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Mapped Department (Auto-Route)</th>
                <th className="py-3 px-4">Default Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {filteredCategories.map((cat) => {
                const isEditing = editingCatId === cat.id;
                return (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {cat.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {cat.description}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                            className="px-2.5 py-1 text-xs border border-blue-500 rounded-lg bg-white shadow-2xs font-medium text-slate-900"
                          >
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} {!d.isActive && '(Inactive)'}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleSaveEdit(cat.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Save Mapping"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/80">
                          {cat.departmentName}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      {cat.defaultPriority}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cat.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {cat.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {!isEditing && (
                          <button
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Change mapped department"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => toggleCategoryActive(cat.id)}
                          className={`p-1.5 rounded-lg transition ${
                            cat.isActive
                              ? 'text-rose-500 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={cat.isActive ? 'Deactivate category' : 'Activate category'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Add New Service Category
            </h3>
            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Elevators & Escalators"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe the issues covered by this category..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Mapped Department</label>
                <select
                  value={newDeptId}
                  onChange={(e) => setNewDeptId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Default Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

