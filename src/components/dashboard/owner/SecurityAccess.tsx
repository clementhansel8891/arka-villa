'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  RefreshCw,
  LogIn,
  LogOut,
  Bell,
  UserCheck,
} from 'lucide-react';
import type { SecurityAccessData } from './types';
import { SECURITY_ACCESS } from './mockData';

interface SecurityAccessProps {
  villaId: string;
  onError?: (error: string) => void;
}

export default function SecurityAccess({ villaId, onError }: SecurityAccessProps) {
  const [data, setData] = useState<SecurityAccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'log' | 'alerts' | 'permissions'>('log');

  useEffect(() => {
    loadData();
  }, [villaId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const result = SECURITY_ACCESS[villaId];
      if (!result) throw new Error('Security data not found');
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load security data';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white/3 border border-white/5 p-6 animate-pulse">
        <div className="h-5 w-44 bg-white/10 rounded mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-white/5 rounded" />
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
              <p className="text-white text-sm font-medium">Security & Access Unavailable</p>
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

  const tabs = [
    { id: 'log' as const, label: 'Access Log', icon: LogIn, count: data.accessLog.length },
    { id: 'alerts' as const, label: 'Alerts', icon: Bell, count: data.activeAlerts.filter((a) => !a.resolved).length },
    { id: 'permissions' as const, label: 'Permissions', icon: UserCheck, count: data.usersWithPermissions.length },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-white/3 border border-white/5 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-heritage-gold/10 flex items-center justify-center">
          <Shield size={16} className="text-heritage-gold" />
        </div>
        <div>
          <h2 className="text-white font-serif text-lg">Security & Access</h2>
          <p className="text-white/30 text-xs mt-0.5">Last 30 days activity</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-white/5 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
              activeTab === tab.id
                ? 'text-heritage-gold bg-heritage-gold/10 border border-heritage-gold/30'
                : 'text-white/40 hover:text-white/70 border border-transparent'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-heritage-gold/20' : 'bg-white/10'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Access Log Tab */}
      {activeTab === 'log' && (
        <div className="space-y-2">
          {data.accessLog.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between p-3 bg-white/3 border border-white/5"
            >
              <div className="flex items-center gap-3">
                {entry.accessType === 'entry' ? (
                  <LogIn size={14} className="text-emerald-400" />
                ) : (
                  <LogOut size={14} className="text-orange-400" />
                )}
                <div>
                  <p className="text-white text-xs">{entry.staffName}</p>
                  <p className="text-white/30 text-[10px]">{entry.role} · {entry.area}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-[10px]">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-white/25 text-[10px]">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-2">
          {data.activeAlerts.length === 0 ? (
            <div className="text-center py-8">
              <Shield size={24} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-white/50 text-sm">No active alerts</p>
            </div>
          ) : (
            data.activeAlerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`p-3 border ${
                  alert.type === 'critical'
                    ? 'bg-red-500/5 border-red-500/20'
                    : alert.type === 'warning'
                    ? 'bg-orange-500/5 border-orange-500/20'
                    : 'bg-blue-500/5 border-blue-500/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      size={14}
                      className={
                        alert.type === 'critical'
                          ? 'text-red-400 mt-0.5'
                          : alert.type === 'warning'
                          ? 'text-orange-400 mt-0.5'
                          : 'text-blue-400 mt-0.5'
                      }
                    />
                    <div>
                      <p className="text-white text-xs">{alert.message}</p>
                      <p className="text-white/30 text-[10px] mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${
                      alert.resolved
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-orange-500/15 text-orange-400'
                    }`}
                  >
                    {alert.resolved ? 'Resolved' : 'Active'}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-2">
          {data.usersWithPermissions.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-3 bg-white/3 border border-white/5"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-white text-xs">{user.name}</p>
                  <p className="text-white/30 text-[10px]">{user.role}</p>
                </div>
                <p className="text-white/25 text-[10px]">
                  Active: {new Date(user.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {user.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="text-[10px] text-heritage-gold/80 bg-heritage-gold/10 px-2 py-0.5"
                  >
                    {perm.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
