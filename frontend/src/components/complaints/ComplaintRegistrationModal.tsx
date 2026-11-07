import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileUp,
  MapPin,
  Paperclip,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Priority } from '../../types';

export const ComplaintRegistrationModal: React.FC = () => {
  const {
    isRegisterModalOpen,
    setIsRegisterModalOpen,
    categories,
    departments,
    createComplaint,
    selectedCampus,
    currentUser,
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat-wifi');
  const [priority, setPriority] = useState<Priority>('HIGH');
  const [building, setBuilding] = useState('Turing Computing Center (Block B)');
  const [room, setRoom] = useState('Auditorium 202');
  const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isRegisterModalOpen) return null;

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const mappedDepartment = departments.find(
    (d) => d.id === selectedCategory?.departmentId && d.isActive
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: string } = {};
    if (!title.trim() || title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters long.';
    }
    if (!description.trim() || description.length < 15) {
      newErrors.description = 'Please provide detailed description (at least 15 characters).';
    }
    if (!building.trim()) {
      newErrors.building = 'Building/Block is required.';
    }
    if (!room.trim()) {
      newErrors.room = 'Room/Lab number is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      createComplaint({
        title,
        description,
        categoryId,
        priority,
        campus: selectedCampus,
        building,
        room,
        attachmentName,
      });

      setIsSubmitting(false);
      setIsRegisterModalOpen(false);
      // Reset form
      setTitle('');
      setDescription('');
      setAttachmentName(undefined);
      setErrors({});
    }, 400);
  };

  const handleSimulateUpload = () => {
    setAttachmentName('error_screenshot_lab.png');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/60">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Campus Service Management
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Register New Service Request
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submitting as <span className="font-semibold text-slate-700">{currentUser.fullName}</span> ({currentUser.role})
            </p>
          </div>
          <button
            onClick={() => setIsRegisterModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* FR-05 Real-time Routing Preview Card */}
          <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/60 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-blue-900">
                Automated Department Routing Preview:
              </span>
              <p className="text-blue-800 mt-0.5 leading-relaxed">
                Selecting category <span className="font-bold underline">{selectedCategory?.name}</span> will
                automatically route this ticket to{' '}
                <span className="font-bold text-blue-950">
                  {mappedDepartment?.name || 'Central Administration Review'}
                </span>
                . SLA Target:{' '}
                <span className="font-bold">
                  {priority === 'HIGH' ? '24 Hours' : priority === 'MEDIUM' ? '72 Hours' : '120 Hours'}
                </span>
                .
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Issue Summary / Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Wi-Fi dropping intermittently during lecture, or Projector bulb broken"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors({ ...errors, title: '' });
              }}
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 transition ${
                errors.title
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
            {errors.title && <p className="text-xs text-rose-600 font-medium">{errors.title}</p>}
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {categories
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.departmentName})
                    </option>
                  ))}
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Priority Level <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as Priority[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setPriority(lvl)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition ${
                      priority === lvl
                        ? lvl === 'HIGH'
                          ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200'
                          : lvl === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-200'
                          : 'bg-slate-100 text-slate-800 border-slate-300 ring-2 ring-slate-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Provide exact details of the incident, frequency, device numbers, or safety risks..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors({ ...errors, description: '' });
              }}
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 transition ${
                errors.description
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-rose-600 font-medium">{errors.description}</p>
            )}
          </div>

          {/* Location Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Building or Block <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Faraday Hall of Engineering"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Room or Lab Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Room 204 or Physics Lab B"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Attachment Box (FR-14) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Supporting Photo / Diagnostic Attachment (Optional)
            </label>
            <div
              onClick={handleSimulateUpload}
              className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition group"
            >
              {attachmentName ? (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-700">
                  <Paperclip className="w-4 h-4 text-blue-600" />
                  <span>{attachmentName} (1.4 MB) attached</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachmentName(undefined);
                    }}
                    className="ml-2 text-rose-500 hover:text-rose-700 font-bold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1 text-xs text-slate-500">
                  <FileUp className="w-6 h-6 mx-auto text-slate-400 group-hover:text-blue-500 transition" />
                  <p className="font-medium text-slate-700">
                    Click to attach screenshot, photo, or PDF diagnostics
                  </p>
                  <p className="text-[11px] text-slate-400">PNG, JPG, PDF up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

