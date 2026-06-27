'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AttendanceRecord {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number;
  status: 'present' | 'late' | 'absent';
}

interface AttendanceCardProps {
  records: AttendanceRecord[];
  isClockedIn: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
}

const statusConfig = {
  present: { label: 'Present', icon: CheckCircle, color: 'text-green-400' },
  late: { label: 'Late', icon: AlertCircle, color: 'text-yellow-400' },
  absent: { label: 'Absent', icon: MinusCircle, color: 'text-red-400' },
};

export default function AttendanceCard({
  records,
  isClockedIn,
  onClockIn,
  onClockOut,
}: AttendanceCardProps) {
  const [showFullMonth, setShowFullMonth] = useState(false);

  const todayRecord = records[0];
  const displayRecords = showFullMonth ? records : records.slice(0, 7);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-heritage-gold" />
          <h3 className="text-white font-semibold text-sm">Attendance</h3>
        </div>
        {todayRecord && (
          <span className={cn('text-xs font-medium', statusConfig[todayRecord.status].color)}>
            Today: {statusConfig[todayRecord.status].label}
          </span>
        )}
      </div>

      {/* Clock In/Out Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={isClockedIn ? onClockOut : onClockIn}
        className={cn(
          'w-full py-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 mb-4 transition-colors',
          isClockedIn
            ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
            : 'bg-heritage-gold/20 text-heritage-gold border border-heritage-gold/30 hover:bg-heritage-gold/30'
        )}
        aria-label={isClockedIn ? 'Clock out' : 'Clock in'}
      >
        {isClockedIn ? (
          <>
            <LogOut size={18} />
            Tap to Clock Out
          </>
        ) : (
          <>
            <LogIn size={18} />
            Tap to Clock In
          </>
        )}
      </motion.button>

      {/* Monthly Record */}
      <div className="space-y-2">
        <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">
          Monthly Record
        </h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {displayRecords.map((record) => {
            const StatusIcon = statusConfig[record.status].icon;
            return (
              <div
                key={record.date}
                className="flex items-center justify-between py-1.5 px-2 rounded-md bg-white/[0.02]"
              >
                <div className="flex items-center gap-2">
                  <StatusIcon
                    size={14}
                    className={statusConfig[record.status].color}
                  />
                  <span className="text-white/80 text-xs">{record.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/50 text-[11px]">
                    {record.clockIn ?? '--:--'} – {record.clockOut ?? '--:--'}
                  </span>
                  <span className="text-white/70 text-xs font-medium min-w-[36px] text-right">
                    {record.hoursWorked > 0 ? `${record.hoursWorked}h` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {records.length > 7 && (
          <button
            onClick={() => setShowFullMonth(!showFullMonth)}
            className="text-heritage-gold/80 text-xs hover:text-heritage-gold transition-colors mt-2"
          >
            {showFullMonth ? 'Show less' : `View all ${records.length} days`}
          </button>
        )}
      </div>
    </div>
  );
}
