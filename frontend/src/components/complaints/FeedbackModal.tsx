import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const FeedbackModal: React.FC = () => {
  const {
    isFeedbackModalOpen,
    setIsFeedbackModalOpen,
    feedbackTargetComplaint,
    submitFeedback,
  } = useApp();

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isFeedbackModalOpen || !feedbackTargetComplaint) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      submitFeedback(feedbackTargetComplaint.id, rating, comments);
      setIsSubmitting(false);
      setIsFeedbackModalOpen(false);
      setComments('');
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-amber-50/50">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Resolution Quality Assurance
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Submit Service Feedback
            </h3>
          </div>
          <button
            onClick={() => setIsFeedbackModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <p className="font-mono font-bold text-blue-600 mb-0.5">
              {feedbackTargetComplaint.complaintNumber}
            </p>
            <p className="font-semibold text-slate-900 line-clamp-1">
              {feedbackTargetComplaint.title}
            </p>
            <p className="text-slate-500 mt-0.5">
              Resolved by {feedbackTargetComplaint.assignedDepartmentName}
            </p>
          </div>

          {/* Star Rating */}
          <div className="text-center space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Overall Satisfaction (1 to 5 Stars)
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 focus:outline-none transition transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        isFilled
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-slate-200 fill-slate-50 hover:text-amber-200'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-xs font-bold text-amber-700">
              {rating === 5
                ? 'Excellent, issue resolved completely!'
                : rating === 4
                ? 'Very good, satisfied with the turnaround'
                : rating === 3
                ? 'Average resolution'
                : rating === 2
                ? 'Below expectations'
                : 'Unsatisfactory response'}
            </p>
          </div>

          {/* Comments */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Comments & Observations
            </label>
            <textarea
              rows={3}
              placeholder="Tell us about the speed of service, communication, or if anything remains unaddressed..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsFeedbackModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-2xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

