import React, { useMemo } from 'react';
import {
  HeartHandshake,
  MessageSquare,
  Sparkles,
  Star,
  ThumbsUp,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const FeedbackAnalyticsView: React.FC = () => {
  const { complaints, setSelectedComplaint } = useApp();

  const feedbackList = useMemo(() => {
    return complaints
      .filter((c) => c.feedback !== undefined)
      .map((c) => ({
        complaint: c,
        feedback: c.feedback!,
      }));
  }, [complaints]);

  const totalReviews = feedbackList.length;

  const avgRating = totalReviews
    ? (
        feedbackList.reduce((acc, item) => acc + item.feedback.rating, 0) /
        totalReviews
      ).toFixed(1)
    : '5.0';

  const starCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    feedbackList.forEach((item) => {
      const r = Math.min(5, Math.max(1, item.feedback.rating));
      counts[r - 1]++;
    });
    return counts;
  }, [feedbackList]);

  const positivePercent = totalReviews
    ? Math.round(
        ((starCounts[3] + starCounts[4]) / totalReviews) * 100
      )
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Student & Faculty CSAT
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            FR-09 Compliant
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Feedback & Customer Satisfaction Analytics
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Verbatim ratings and resolution quality evaluations submitted after service completion.
        </p>
      </div>

      {/* CSAT Metric Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Average Score Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex flex-col items-center justify-center shrink-0">
            <span className="text-2xl font-black">{avgRating}</span>
            <div className="flex text-amber-500">
              <Star className="w-3 h-3 fill-amber-400" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Institutional CSAT Score</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Based on {totalReviews} resolved ticket reviews
            </p>
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <ThumbsUp className="w-3 h-3" />
              <span>{positivePercent}% Positive Rating</span>
            </div>
          </div>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs md:col-span-2 flex flex-col justify-center space-y-2">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Rating Distribution
          </p>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = starCounts[star - 1] || 0;
            const pct = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-medium text-slate-600 flex items-center gap-1">
                  {star} <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right font-semibold text-slate-700 tabular-nums">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verbatim Reviews Feed */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Recent Verbatim Requester Feedback
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Showing all {feedbackList.length} reviews
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {feedbackList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No feedback submitted yet. Reviews appear once requesters rate resolved tickets.
            </div>
          ) : (
            feedbackList.map(({ complaint: c, feedback: fb }) => (
              <div
                key={fb.id}
                onClick={() => setSelectedComplaint(c)}
                className="p-4 hover:bg-slate-50/70 transition cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600">
                      {c.complaintNumber}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      {c.title}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      • {c.assignedDepartmentName}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    "{fb.comments || 'No comment provided'}"
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <User className="w-3 h-3 text-slate-400" />
                      {fb.userName}
                    </span>
                    <span>•</span>
                    <span>{new Date(fb.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-amber-500 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < fb.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200 fill-slate-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

