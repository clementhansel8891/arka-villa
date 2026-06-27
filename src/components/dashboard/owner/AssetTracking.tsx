'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { AssetTrackingData, AssetCategory } from './types';
import { ASSET_TRACKING } from './mockData';

interface AssetTrackingProps {
  villaId: string;
  onError?: (error: string) => void;
}

const CONDITION_COLORS: Record<string, string> = {
  excellent: 'text-emerald-400 bg-emerald-500/15',
  good: 'text-blue-400 bg-blue-500/15',
  fair: 'text-heritage-gold bg-heritage-gold/15',
  poor: 'text-red-400 bg-red-500/15',
};

export default function AssetTracking({ villaId, onError }: AssetTrackingProps) {
  const [data, setData] = useState<AssetTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [villaId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const result = ASSET_TRACKING[villaId];
      if (!result) throw new Error('Asset data not found');
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load asset tracking';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white/3 border border-white/5 p-6 animate-pulse">
        <div className="h-5 w-40 bg-white/10 rounded mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded" />
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
              <p className="text-white text-sm font-medium">Asset Tracking Unavailable</p>
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

  if (!data) return null;

  function toggleCategory(name: string) {
    setExpandedCategory((prev) => (prev === name ? null : name));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-white/3 border border-white/5 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-heritage-gold/10 flex items-center justify-center">
            <Package size={16} className="text-heritage-gold" />
          </div>
          <div>
            <h2 className="text-white font-serif text-lg">Asset Tracking</h2>
            <p className="text-white/30 text-xs mt-0.5">
              Max 500 items per villa · {data.totalAssets} tracked
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-[10px] uppercase tracking-widest">Total Value</p>
          <p className="text-heritage-gold font-serif text-lg">
            ${data.totalReplacementValue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {data.categories.map((category: AssetCategory, i: number) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <button
              onClick={() => toggleCategory(category.name)}
              className="w-full flex items-center justify-between p-3 bg-white/3 border border-white/5 hover:border-heritage-gold/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedCategory === category.name ? (
                  <ChevronDown size={14} className="text-heritage-gold" />
                ) : (
                  <ChevronRight size={14} className="text-white/40" />
                )}
                <span className="text-white text-sm">{category.name}</span>
              </div>
              <span className="text-white/40 text-xs">
                {category.count} items
              </span>
            </button>

            {expandedCategory === category.name && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border border-white/5 border-t-0"
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-white/25 text-[10px] uppercase tracking-widest border-b border-white/5">
                        <th className="text-left px-3 py-2 font-normal">Name</th>
                        <th className="text-left px-3 py-2 font-normal hidden sm:table-cell">Purchase Date</th>
                        <th className="text-left px-3 py-2 font-normal">Condition</th>
                        <th className="text-right px-3 py-2 font-normal">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {category.assets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-white/3 transition-colors">
                          <td className="px-3 py-2.5 text-white text-xs">{asset.name}</td>
                          <td className="px-3 py-2.5 text-white/50 text-xs hidden sm:table-cell">
                            {asset.purchaseDate}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${CONDITION_COLORS[asset.condition]}`}
                            >
                              {asset.condition}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-white text-xs font-mono">
                            ${asset.replacementCost.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
