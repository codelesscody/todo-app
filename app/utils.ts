import { Priority, RecurringType, Todo, Stats } from "./types";

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// Parse date string as local time (not UTC)
export const parseLocalDate = (dateStr: string): Date => {
  return new Date(dateStr + "T00:00:00");
};

export const formatDueDate = (date: string): string => {
  const dueDate = parseLocalDate(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dueDate.getTime() === today.getTime()) return "Today";
  if (dueDate.getTime() === tomorrow.getTime()) return "Tomorrow";
  return dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const isOverdue = (date: string): boolean => {
  const dueDate = parseLocalDate(date);
  dueDate.setHours(23, 59, 59, 999);
  return dueDate < new Date();
};

export const getPriorityColor = (priority: Priority, isDark: boolean): string => {
  const colors = {
    high: isDark ? "text-red-400" : "text-red-600",
    medium: isDark ? "text-yellow-400" : "text-yellow-600",
    low: isDark ? "text-blue-400" : "text-blue-600",
  };
  return colors[priority];
};

export const getPriorityBg = (priority: Priority, isDark: boolean): string => {
  const colors = {
    high: isDark ? "bg-red-900/30" : "bg-red-50",
    medium: isDark ? "bg-yellow-900/30" : "bg-yellow-50",
    low: isDark ? "bg-blue-900/30" : "bg-blue-50",
  };
  return colors[priority];
};

export const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const playNotificationSound = (): void => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Create a pleasant notification sound
    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
};

export const getNextDueDate = (currentDate: string, recurringType: RecurringType): string => {
  const date = new Date(currentDate + "T00:00:00"); // Parse as local time
  switch (recurringType) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const getTodayDateString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export const exportToObsidian = (todos: Todo[]): string => {
  const lines: string[] = [];

  [...todos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).forEach((todo) => {
    const checkbox = todo.completed ? "[x]" : "[ ]";
    const category = todo.category ? `@${todo.category} ` : "";
    const dueDate = todo.dueDate ? `📅 ${todo.dueDate} ` : "";
    const completedDate = todo.completedAt ? `✅ ${todo.completedAt.split("T")[0]} ` : "";
    const timeEst = todo.timeEstimate ? `⏱${todo.timeEstimate}m ` : "";
    const tags = todo.tags?.length ? todo.tags.map(t => `#${t}`).join(" ") + " " : "";

    lines.push(`- ${checkbox} ${category}${tags}${dueDate}${timeEst}${todo.text}${todo.completed ? ` ${completedDate}` : ""}`);

    // Add notes as indented text
    if (todo.notes) {
      todo.notes.split("\n").forEach((noteLine) => {
        lines.push(`  ${noteLine}`);
      });
    }

    // Add subtasks
    if (todo.subtasks && todo.subtasks.length > 0) {
      todo.subtasks.forEach((st) => {
        const stCheckbox = st.completed ? "[x]" : "[ ]";
        lines.push(`  - ${stCheckbox} ${st.text}`);
      });
    }
  });

  return lines.join("\n");
};

export const exportToJSON = (todos: Todo[]): string => {
  return JSON.stringify(todos, null, 2);
};

export const downloadExport = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const calculateStats = (todos: Todo[]): Stats => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const completedTodos = todos.filter((t) => t.completed);
  const activeTodos = todos.filter((t) => !t.completed);

  const completedToday = completedTodos.filter((t) => {
    if (!t.completedAt) return false;
    const completedDate = new Date(t.completedAt);
    return completedDate >= today;
  });

  const completedThisWeek = completedTodos.filter((t) => {
    if (!t.completedAt) return false;
    const completedDate = new Date(t.completedAt);
    return completedDate >= weekAgo;
  });

  const totalPomodoros = todos.reduce((sum, t) => sum + (t.pomodoroCount || 0), 0);
  const totalTimeEstimate = activeTodos.reduce((sum, t) => sum + (t.timeEstimate || 0), 0);

  const overdueTasks = activeTodos.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate + "T23:59:59");
    return dueDate < now;
  });

  const byCategory: { [key: string]: number } = {};
  const byPriority: { [key: string]: number } = { high: 0, medium: 0, low: 0 };
  const byTag: { [key: string]: number } = {};

  activeTodos.forEach((t) => {
    if (t.category) {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    }
    if (t.priority) {
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    }
    t.tags?.forEach((tag) => {
      byTag[tag] = (byTag[tag] || 0) + 1;
    });
  });

  return {
    total: todos.length,
    active: activeTodos.length,
    completed: completedTodos.length,
    completedToday: completedToday.length,
    completedThisWeek: completedThisWeek.length,
    totalPomodoros,
    pomodoroMinutes: totalPomodoros * 25,
    totalTimeEstimate,
    overdue: overdueTasks.length,
    completionRate: todos.length > 0 ? Math.round((completedTodos.length / todos.length) * 100) : 0,
    byCategory,
    byPriority,
    byTag,
  };
};
