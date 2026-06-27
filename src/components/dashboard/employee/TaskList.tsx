'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Task {
  id: string;
  title: string;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
}

interface TaskListProps {
  dailyTasks: Task[];
  weeklyTasks: Task[];
  onTaskSelect: (task: Task) => void;
}

const priorityConfig = {
  High: { color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  Medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  Low: { color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

const statusConfig = {
  pending: { icon: Clock, color: 'text-white/50' },
  in_progress: { icon: Clock, color: 'text-blue-400' },
  completed: { icon: CheckCircle2, color: 'text-green-400' },
  overdue: { icon: AlertTriangle, color: 'text-red-400' },
};

function sortByPriority(tasks: Task[]): Task[] {
  const order = { High: 0, Medium: 1, Low: 2 };
  return [...tasks].sort((a, b) => order[a.priority] - order[b.priority]);
}

function TaskItem({ task, onSelect }: { task: Task; onSelect: (task: Task) => void }) {
  const StatusIcon = statusConfig[task.status].icon;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(task)}
      className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors text-left"
    >
      <StatusIcon size={16} className={statusConfig[task.status].color} />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">{task.title}</p>
        <p className="text-white/40 text-[11px] mt-0.5">{task.deadline}</p>
      </div>
      <span
        className={cn(
          'text-[10px] font-medium px-2 py-0.5 rounded-full border',
          priorityConfig[task.priority].color
        )}
      >
        {task.priority}
      </span>
      <ChevronRight size={14} className="text-white/30" />
    </motion.button>
  );
}

export default function TaskList({ dailyTasks, weeklyTasks, onTaskSelect }: TaskListProps) {
  const sortedDaily = sortByPriority(dailyTasks);
  const sortedWeekly = sortByPriority(weeklyTasks);

  return (
    <div className="space-y-4">
      {/* Daily Tasks */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">Today&apos;s Tasks</h3>
          <span className="text-white/40 text-xs">{sortedDaily.length} tasks</span>
        </div>
        {sortedDaily.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">No tasks for today</p>
        ) : (
          <div className="space-y-2">
            {sortedDaily.map((task) => (
              <TaskItem key={task.id} task={task} onSelect={onTaskSelect} />
            ))}
          </div>
        )}
      </div>

      {/* Weekly Tasks */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">This Week</h3>
          <span className="text-white/40 text-xs">{sortedWeekly.length} tasks</span>
        </div>
        {sortedWeekly.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">No tasks this week</p>
        ) : (
          <div className="space-y-2">
            {sortedWeekly.map((task) => (
              <TaskItem key={task.id} task={task} onSelect={onTaskSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
