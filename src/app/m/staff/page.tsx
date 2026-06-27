'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, MapPin, Briefcase, CalendarDays, DollarSign } from 'lucide-react';
import AttendanceCard, { type AttendanceRecord } from '@/components/dashboard/employee/AttendanceCard';
import TaskList, { type Task } from '@/components/dashboard/employee/TaskList';
import TaskCompletion, { type TaskEvidence } from '@/components/dashboard/employee/TaskCompletion';
import ReportsSection, { type DailyReport } from '@/components/dashboard/employee/ReportsSection';

// Mock data — to be replaced with API calls
const mockAttendance: AttendanceRecord[] = [
  { date: 'Jun 15', clockIn: '08:02', clockOut: '17:05', hoursWorked: 9, status: 'present' },
  { date: 'Jun 14', clockIn: '08:35', clockOut: '17:00', hoursWorked: 8.4, status: 'late' },
  { date: 'Jun 13', clockIn: '07:58', clockOut: '17:10', hoursWorked: 9.2, status: 'present' },
  { date: 'Jun 12', clockIn: null, clockOut: null, hoursWorked: 0, status: 'absent' },
  { date: 'Jun 11', clockIn: '08:00', clockOut: '17:00', hoursWorked: 9, status: 'present' },
  { date: 'Jun 10', clockIn: '08:01', clockOut: '16:55', hoursWorked: 8.9, status: 'present' },
  { date: 'Jun 9', clockIn: '07:55', clockOut: '17:02', hoursWorked: 9.1, status: 'present' },
  { date: 'Jun 8', clockIn: '08:10', clockOut: '17:00', hoursWorked: 8.8, status: 'present' },
];

const mockDailyTasks: Task[] = [
  { id: '1', title: 'Clean pool area', deadline: 'Today 10:00', priority: 'High', status: 'overdue' },
  { id: '2', title: 'Prepare guest welcome package', deadline: 'Today 14:00', priority: 'Medium', status: 'pending' },
  { id: '3', title: 'Check garden irrigation system', deadline: 'Today 16:00', priority: 'Low', status: 'pending' },
];

const mockWeeklyTasks: Task[] = [
  { id: '4', title: 'Deep clean master bathroom', deadline: 'Wed, Jun 18', priority: 'High', status: 'in_progress' },
  { id: '5', title: 'Inventory check - linens', deadline: 'Thu, Jun 19', priority: 'Medium', status: 'pending' },
  { id: '6', title: 'Landscape trimming - front garden', deadline: 'Fri, Jun 20', priority: 'Low', status: 'pending' },
];

const mockReports: DailyReport[] = [
  { id: 'r1', date: 'Jun 14', content: 'Completed morning pool cleaning, guest check-in at 14:00, restocked minibar supplies.', submittedAt: '17:15' },
  { id: 'r2', date: 'Jun 13', content: 'Deep cleaned Villa Bali suite, replaced broken lamp in lobby, coordinated with maintenance team.', submittedAt: '17:30' },
];

const mockSchedule = [
  { day: 'Mon, Jun 16', shift: '08:00 - 17:00' },
  { day: 'Tue, Jun 17', shift: '08:00 - 17:00' },
  { day: 'Wed, Jun 18', shift: '08:00 - 17:00' },
  { day: 'Thu, Jun 19', shift: 'Day Off' },
  { day: 'Fri, Jun 20', shift: '08:00 - 17:00' },
  { day: 'Sat, Jun 21', shift: '08:00 - 13:00' },
  { day: 'Sun, Jun 22', shift: 'Day Off' },
];

export default function StaffDashboardPage() {
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState({ daily: mockDailyTasks, weekly: mockWeeklyTasks });
  const [reports, setReports] = useState(mockReports);

  const overdueTasks = [...tasks.daily, ...tasks.weekly].filter(
    (t) => t.status === 'overdue'
  );

  function handleClockIn() {
    setIsClockedIn(true);
  }

  function handleClockOut() {
    setIsClockedIn(false);
  }

  function handleTaskComplete(taskId: string, _evidence: TaskEvidence) {
    setTasks((prev) => ({
      daily: prev.daily.map((t) =>
        t.id === taskId ? { ...t, status: 'completed' as const } : t
      ),
      weekly: prev.weekly.map((t) =>
        t.id === taskId ? { ...t, status: 'completed' as const } : t
      ),
    }));
    setSelectedTask(null);
  }

  function handleSubmitReport(content: string) {
    const today = new Date();
    const newReport: DailyReport = {
      id: `r-${Date.now()}`,
      date: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      content,
      submittedAt: today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
    setReports((prev) => [newReport, ...prev]);
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-lg font-semibold">Good morning, Staff</h1>
          <p className="text-white/40 text-xs">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-heritage-gold flex items-center justify-center text-heritage-charcoal font-bold text-sm">
          S
        </div>
      </div>

      {/* Overdue Task Alert */}
      {overdueTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <div>
            <p className="text-red-400 text-xs font-semibold">
              {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
            </p>
            <p className="text-red-400/60 text-[11px]">
              Overdue by more than 1 hour — please complete or request reassignment
            </p>
          </div>
        </motion.div>
      )}

      {/* Attendance Card */}
      <AttendanceCard
        records={mockAttendance}
        isClockedIn={isClockedIn}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
      />

      {/* Task List */}
      <TaskList
        dailyTasks={tasks.daily}
        weeklyTasks={tasks.weekly}
        onTaskSelect={setSelectedTask}
      />

      {/* Reports Section */}
      <ReportsSection reports={reports} onSubmitReport={handleSubmitReport} />

      {/* Work Info Card */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
        <h3 className="text-white font-semibold text-sm">Work Information</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.03] rounded-lg p-3">
            <DollarSign size={14} className="text-heritage-gold mb-1" />
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Pay Rate</p>
            <p className="text-white text-sm font-medium">IDR 150,000/day</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3">
            <Briefcase size={14} className="text-heritage-gold mb-1" />
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Role</p>
            <p className="text-white text-sm font-medium">Housekeeping</p>
          </div>
        </div>

        <div className="bg-white/[0.03] rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin size={14} className="text-heritage-gold" />
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Assigned Villas</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-white/80 text-xs bg-white/5 px-2 py-0.5 rounded">Arka Villa</span>
            <span className="text-white/80 text-xs bg-white/5 px-2 py-0.5 rounded">Villa Serenity</span>
          </div>
        </div>

        <div className="bg-white/[0.03] rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <CalendarDays size={14} className="text-heritage-gold" />
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Upcoming Schedule (7 days)</p>
          </div>
          <div className="space-y-1">
            {mockSchedule.map((item) => (
              <div key={item.day} className="flex items-center justify-between">
                <span className="text-white/60 text-xs">{item.day}</span>
                <span className="text-white/80 text-xs font-medium">{item.shift}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task Completion Modal */}
      {selectedTask && (
        <TaskCompletion
          task={selectedTask}
          onSubmit={handleTaskComplete}
          onCancel={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
