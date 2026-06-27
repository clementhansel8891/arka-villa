'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { calculateSatisfactionScore } from './satisfaction-score';

interface MonthlySatisfaction {
  month: string;
  year: number;
  score: number | null;
  reviewCount: number;
  ratings: number[];
}

interface SatisfactionScoresProps {
  villaId: string;
  onError?: (error: string) => void;
}

function generateMockSatisfactionData(villaId: string): MonthlySatisfaction[] {
  const baseScores: Record<string, number[][]> = {
    'villa-001': [
      [5, 4, 5, 5, 4, 5, 5, 4], // Jan
      [5, 5, 4, 5, 4, 5, 5],    // Feb
      [4, 5, 5, 5, 4, 4, 5, 5, 5], // Mar
      [5, 5, 4, 5, 5, 5, 4, 5], // Apr
      [4, 5, 5, 4, 5, 5, 5, 4, 5], // May
      [5, 5, 5, 4, 5, 5, 5, 5, 4, 5], // Jun
    ],
    'villa-002': [
      [4, 5, 4, 4, 5, 4],       // Jan
      [5, 4, 4, 5, 4, 5],       // Feb
      [4, 5, 5, 4, 4, 5, 4],    // Mar
      [5, 4, 5, 4, 5, 4],       // Apr
      [4, 5, 4, 5, 5, 4, 5],    // May
      [5, 5, 4, 4, 5, 4, 5, 4], // Jun
    ],
    'villa-003': [
      [5, 5, 5, 5, 4, 5, 5, 5, 5], // Jan
      [5, 5, 5, 4, 5, 5, 5, 5],    // Feb
      [5, 5, 5, 5, 5, 4, 5, 5, 5], // Mar
      [5, 5, 5, 5, 5, 5, 4, 5],    // Apr
      [5, 5, 5, 5, 5, 5, 5, 4, 5], // May
      [5, 5, 5, 5, 5, 5, 5, 5, 5, 5], // Jun
    ],
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June'];
  const villaRatings = baseScores[villaId] ?? baseScores['villa-001'];

  return months.map((month, i) => {
    const ratings = villaRatings[i] ?? [];
    return {
      month,
      year: 2026,
      score: calculateSatisfactionScore(ratings),
      reviewCount: ratings.length,
      ratings,
    };
  });
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-white/30';
  if (score >= 4.5) return 'text-emerald-400';
  if (score >= 4.0) return 'text-heritage-gold';
  if (score >= 3.0) return 'text-amber-400';
  return 'text-red-400';
}

function renderStars(score: number | null) {
  if (score === null) return null;
  const fullStars = Math.floor(score);
  const hasHalfStar = score - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} size={12} className="text-heritage-gold fill-heritage-gold" />
      ))}
      {hasHalfStar && (
        <Star key="half" size={12} className="text-heritage-gold fill-heritage-gold/50" />
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} size={12} className="text-white/10" />
      ))}
    </div>
  );
}

export default function SatisfactionScores({ villaId, onError }: SatisfactionScoresProps) {
  const [data, setData] = useState<MonthlySatisfaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const result = generateMockSatisfactionData(villaId);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load satisfaction scores';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [villaId, onError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="bg-white/3 border border-white/5 p-6 animate-pulse">
        <div className="h-5 w-44 bg-white/10 rounded mb-6" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/3 border border-red-500/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400" />
            <div>
              <p className="text-white text-sm font-medium">Satisfaction Scores Unavailable</p>
              <p className="text-white/40 text-xs mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-heritage-gold border border-heritage-gold/30 hover:bg-heritage-gold/10 transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate overall average
  const allScores = data.filter((m) => m.score !== null).map((m) => m.score as number);
  const overallAverage = allScores.length > 0
    ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
    : null;
  const totalReviews = data.reduce((sum, m) => sum + m.reviewCount, 0);

  // Trend calculation
  const recentMonths = data.slice(-2);
  const trend = recentMonths.length === 2 && recentMonths[0].score !== null && recentMonths[1].score !== null
    ? recentMonths[1].score - recentMonths[0].score
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white/3 border border-white/5 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-heritage-gold/10 flex items-center justify-center">
            <Star size={16} className="text-heritage-gold" />
          </div>
          <div>
            <h2 className="text-white font-serif text-lg">Guest Satisfaction</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">
              Monthly averages · 1-5 scale
            </p>
          </div>
        </div>
        {overallAverage !== null && (
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className={`font-serif text-2xl ${getScoreColor(overallAverage)}`}>
                {overallAverage.toFixed(1)}
              </span>
              {trend !== null && trend !== 0 && (
                <span className="flex items-center gap-0.5">
                  {trend > 0 ? (
                    <TrendingUp size={12} className="text-emerald-400" />
                  ) : (
                    <TrendingDown size={12} className="text-red-400" />
                  )}
                </span>
              )}
            </div>
            <p className="text-white/25 text-[10px]">{totalReviews} total reviews</p>
          </div>
        )}
      </div>

      {/* Monthly Scores Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {data.map((month, i) => (
          <motion.div
            key={month.month}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="bg-white/3 border border-white/5 p-3 text-center hover:border-heritage-gold/20 transition-colors"
          >
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">
              {month.month.slice(0, 3)}
            </p>
            {month.score !== null ? (
              <>
                <p className={`font-serif text-xl ${getScoreColor(month.score)}`}>
                  {month.score.toFixed(1)}
                </p>
                <div className="flex justify-center mt-1.5">
                  {renderStars(month.score)}
                </div>
                <p className="text-white/20 text-[10px] mt-1.5">
                  {month.reviewCount} reviews
                </p>
              </>
            ) : (
              <div className="py-2">
                <p className="text-white/20 text-xs">No data</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Score Legend */}
      <div className="mt-6 pt-4 border-t border-white/5">
        <div className="flex flex-wrap items-center gap-4 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-white/30 text-[10px]">Excellent (4.5+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-heritage-gold" />
            <span className="text-white/30 text-[10px]">Good (4.0-4.4)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-white/30 text-[10px]">Average (3.0-3.9)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-white/30 text-[10px]">Poor (&lt;3.0)</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
