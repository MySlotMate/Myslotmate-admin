import React, { useState } from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const ReviewsDirectory: React.FC = () => {
  const { reviews, setReviews } = useMockData();
  const [filter, setFilter] = useState('All');

  const filteredReviews = reviews.filter(review => {
    if (filter === 'All') return true;
    return review.status === filter;
  });

  const handleDelete = (id: string) => {
    setReviews(prev => prev.filter(r => r.reviewId !== id));
    alert('Review deleted from the system database.');
  };

  const handleToggleFlag = (id: string, currentStatus: string) => {
    setReviews(prev => prev.map(review => {
      if (review.reviewId === id) {
        const nextStatus = currentStatus === 'Flagged' ? 'Published' : 'Flagged';
        return { ...review, status: nextStatus };
      }
      return review;
    }));
  };

  const getStatusColor = (status: string): 'green' | 'blue' | 'amber' | 'rose' => {
    switch (status) {
      case 'Published': return 'green';
      case 'Needs review': return 'amber';
      case 'Flagged': return 'rose';
      default: return 'blue';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Reviews moderation</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Moderate guest feedback and escalate suspicious review patterns.
          </h3>
        </div>
        <Button variant="primary" onClick={() => setFilter('Flagged')}>
          Open flagged reviews
        </Button>
      </div>

      {/* Toggle filters */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Published', 'Needs review', 'Flagged'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold cursor-pointer transition hover:border-brand-300 hover:text-brand-700 ${
              filter === status
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-brand-100 bg-white text-slate-600'
            }`}
          >
            {status} ({status === 'All' ? reviews.length : reviews.filter(r => r.status === status).length})
          </button>
        ))}
      </div>

      {/* Reviews Table */}
      {filteredReviews.length > 0 ? (
        <Table headers={['Review ID', 'User', 'Experience', 'Rating', 'Review Text', 'Date', 'Status', 'Actions']}>
          {filteredReviews.map((review) => (
            <tr key={review.reviewId} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
              <td className="px-6 py-4 align-top font-extrabold text-ink">{review.reviewId}</td>
              <td className="px-6 py-4 align-top text-slate-700 font-semibold">{review.user}</td>
              <td className="px-6 py-4 align-top text-slate-700 font-medium max-w-[150px] truncate">{review.experience}</td>
              <td className="px-6 py-4 align-top font-extrabold text-brand-600">{review.rating} ★</td>
              <td className="px-6 py-4 align-top text-slate-600 max-w-xs break-words leading-relaxed">{review.reviewText}</td>
              <td className="px-6 py-4 align-top text-slate-500">{review.date}</td>
              <td className="px-6 py-4 align-top">
                <Badge color={getStatusColor(review.status)}>{review.status}</Badge>
              </td>
              <td className="px-6 py-4 align-top">
                <div className="flex gap-2">
                  <Button variant="action" onClick={() => handleDelete(review.reviewId)} className="hover:text-rose-600 hover:border-rose-300">
                    Remove
                  </Button>
                  <Button 
                    variant="action" 
                    onClick={() => handleToggleFlag(review.reviewId, review.status)}
                    className={review.status === 'Flagged' ? 'hover:text-emerald-600 hover:border-emerald-300' : 'hover:text-amber-600 hover:border-amber-300'}
                  >
                    {review.status === 'Flagged' ? 'Unflag' : 'Flag'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Card className="p-10 text-center">
          <p className="text-slate-400 font-medium font-display">No reviews in this moderation filter queue.</p>
        </Card>
      )}
    </div>
  );
};
