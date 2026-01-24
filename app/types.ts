export type Priority = "high" | "medium" | "low";
export type RecurringType = "daily" | "weekly" | "monthly";

export interface Subtask {
  id: number;
  text: string;
  completed: boolean;
}

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  pomodoroStartTime?: number;
  pomodoroDuration?: number; // in milliseconds
  pomodoroPaused?: boolean;
  pomodoroTimeRemaining?: number; // in milliseconds
  pomodoroIsBreak?: boolean; // true if this is a break timer
  pomodoroCount?: number; // number of completed pomodoros (0-3, resets to 0 after long break)
  dueDate?: string; // ISO date string
  priority?: Priority;
  order?: number; // for drag & drop ordering
  category?: string; // e.g., "work", "home", "personal"
  subtasks?: Subtask[];
  recurring?: RecurringType;
  notes?: string;
  tags?: string[];
  timeEstimate?: number; // in minutes
}

export const CATEGORIES = ["work", "home", "personal", "learning", "health"];

export interface Stats {
  total: number;
  active: number;
  completed: number;
  completedToday: number;
  completedThisWeek: number;
  totalPomodoros: number;
  pomodoroMinutes: number;
  totalTimeEstimate: number;
  overdue: number;
  completionRate: number;
  byCategory: { [key: string]: number };
  byPriority: { [key: string]: number };
  byTag: { [key: string]: number };
}
