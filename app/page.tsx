"use client";

import { useState, useEffect, useRef } from "react";

type Priority = "high" | "medium" | "low";
type RecurringType = "daily" | "weekly" | "monthly";

interface Subtask {
  id: number;
  text: string;
  completed: boolean;
}

interface Todo {
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

const CATEGORIES = ["work", "home", "personal", "learning", "health"];

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [newDueDate, setNewDueDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [newRecurring, setNewRecurring] = useState<RecurringType | "">("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [subtaskInput, setSubtaskInput] = useState<{ [key: number]: string }>({});
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [newTimeEstimate, setNewTimeEstimate] = useState<number | "">("");
  const [tagInputForTask, setTagInputForTask] = useState<{ [key: number]: string }>({});
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const hasLoadedRef = useRef(false);

  // Load dark mode preference on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode === "true") {
      setDarkMode(true);
    }
  }, []);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  // Load todos on mount
  useEffect(() => {
    // Prevent double-loading in React Strict Mode
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadTodos = async () => {
      try {
        const response = await fetch("/api/todos");
        if (response.ok) {
          const data = await response.json();
          // Deduplicate by ID just in case
          const uniqueTodos = data.filter(
            (todo: Todo, index: number, self: Todo[]) =>
              index === self.findIndex((t) => t.id === todo.id)
          );
          setTodos(uniqueTodos);
        }
      } catch (error) {
        console.error("Failed to load todos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTodos();
  }, []);

  // Save todos whenever they change
  useEffect(() => {
    if (isLoading) return; // Don't save during initial load

    const saveTodos = async () => {
      try {
        // Deduplicate by ID before saving
        const uniqueTodos = todos.filter(
          (todo, index, self) =>
            index === self.findIndex((t) => t.id === todo.id)
        );
        await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(uniqueTodos),
        });
      } catch (error) {
        console.error("Failed to save todos:", error);
      }
    };

    saveTodos();
  }, [todos, isLoading]);

  // Update current time every second for timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Check for completed timers and show notifications
  useEffect(() => {
    todos.forEach((todo) => {
      if (
        todo.pomodoroStartTime &&
        !todo.pomodoroPaused &&
        !todo.completed
      ) {
        const elapsed = currentTime - todo.pomodoroStartTime;
        const remaining = (todo.pomodoroDuration || 0) - elapsed;

        if (remaining <= 0 && todo.pomodoroDuration) {
          // Timer completed - play sound and show notification
          playNotificationSound();

          const isBreak = todo.pomodoroIsBreak;
          const currentCount = todo.pomodoroCount || 0;
          const isLongBreak = currentCount === 3;

          let notificationTitle = "Pomodoro Complete!";
          let notificationBody = `Work session done for: ${todo.text}. Time for a break!`;

          if (isBreak) {
            notificationTitle = "Break Complete!";
            notificationBody = `Break finished for: ${todo.text}. Ready to focus?`;
          } else if (isLongBreak) {
            notificationBody = `Great work! You've completed 4 pomodoros for: ${todo.text}. Enjoy a 15-minute long break!`;
          } else {
            notificationBody = `Work session done for: ${todo.text}. Take a 5-minute break!`;
          }

          if (Notification.permission === "granted") {
            new Notification(notificationTitle, {
              body: notificationBody,
              icon: "/favicon.ico",
            });
          }

          // If work timer completed, start break timer automatically
          // If break timer completed, just stop the timer
          setTodos((prev) =>
            prev.map((t) => {
              if (t.id === todo.id) {
                if (isBreak) {
                  // Break finished - stop timer
                  return {
                    ...t,
                    pomodoroStartTime: undefined,
                    pomodoroDuration: undefined,
                    pomodoroPaused: undefined,
                    pomodoroTimeRemaining: undefined,
                    pomodoroIsBreak: undefined,
                  };
                } else {
                  // Work session finished - start break
                  const currentCount = t.pomodoroCount || 0;
                  const isLongBreak = currentCount === 3; // 4th pomodoro completed
                  const breakDuration = isLongBreak ? 15 * 60 * 1000 : 5 * 60 * 1000;
                  const newCount = isLongBreak ? 0 : currentCount + 1;

                  return {
                    ...t,
                    pomodoroStartTime: Date.now(),
                    pomodoroDuration: breakDuration,
                    pomodoroPaused: false,
                    pomodoroTimeRemaining: undefined,
                    pomodoroIsBreak: true,
                    pomodoroCount: newCount,
                  };
                }
              }
              return t;
            })
          );
        }
      }
    });
  }, [currentTime, todos]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return;
      }

      const activeList = todos.filter((t) => !t.completed).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      // Ctrl+N or N: Focus new task input
      if (e.key === "n" || (e.ctrlKey && e.key === "n")) {
        e.preventDefault();
        document.getElementById("new-task-input")?.focus();
        return;
      }

      // Arrow keys: Navigate tasks
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        const currentIndex = activeList.findIndex((t) => t.id === selectedTaskId);
        const nextIndex = currentIndex < activeList.length - 1 ? currentIndex + 1 : 0;
        setSelectedTaskId(activeList[nextIndex]?.id ?? null);
        return;
      }

      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        const currentIndex = activeList.findIndex((t) => t.id === selectedTaskId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : activeList.length - 1;
        setSelectedTaskId(activeList[prevIndex]?.id ?? null);
        return;
      }

      // Space: Start/pause timer on selected task
      if (e.key === " " && selectedTaskId) {
        e.preventDefault();
        const todo = todos.find((t) => t.id === selectedTaskId);
        if (todo) {
          if (todo.pomodoroStartTime && !todo.pomodoroPaused) {
            pausePomodoro(selectedTaskId);
          } else if (todo.pomodoroPaused) {
            resumePomodoro(selectedTaskId);
          } else {
            startPomodoro(selectedTaskId);
          }
        }
        return;
      }

      // Enter: Complete selected task
      if (e.key === "Enter" && selectedTaskId) {
        e.preventDefault();
        toggleTodo(selectedTaskId);
        return;
      }

      // Delete or Backspace: Delete selected task
      if ((e.key === "Delete" || e.key === "Backspace") && selectedTaskId) {
        e.preventDefault();
        deleteTodo(selectedTaskId);
        setSelectedTaskId(null);
        return;
      }

      // Escape: Deselect / close modals
      if (e.key === "Escape") {
        setSelectedTaskId(null);
        setShowExportModal(false);
        setShowStatsModal(false);
        return;
      }

      // E: Export modal
      if (e.key === "e") {
        e.preventDefault();
        setShowExportModal(true);
        return;
      }

      // S: Stats modal
      if (e.key === "s") {
        e.preventDefault();
        setShowStatsModal(true);
        return;
      }

      // A: Toggle archive view
      if (e.key === "a") {
        e.preventDefault();
        setShowArchive((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [todos, selectedTaskId]);

  const addTodo = () => {
    if (input.trim() === "") return;

    const maxOrder = Math.max(0, ...todos.map((t) => t.order ?? 0));
    const newTodo: Todo = {
      id: Date.now(),
      text: input,
      completed: false,
      createdAt: new Date().toISOString(),
      dueDate: newDueDate || undefined,
      priority: newPriority || undefined,
      order: maxOrder + 1,
      category: newCategory || undefined,
      recurring: newRecurring || undefined,
      tags: newTags.length > 0 ? newTags : undefined,
      timeEstimate: newTimeEstimate ? Number(newTimeEstimate) : undefined,
    };

    setTodos([...todos, newTodo]);
    setInput("");
    const today = new Date();
    setNewDueDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    setNewPriority("medium");
    setNewCategory("");
    setNewRecurring("");
    setNewTags([]);
    setTagInput("");
    setNewTimeEstimate("");
  };

  const getNextDueDate = (currentDate: string, recurringType: RecurringType): string => {
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

  const toggleTodo = (id: number) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    // If completing a recurring task, create a new instance
    if (!todo.completed && todo.recurring && todo.dueDate) {
      const newId = Date.now() + Math.floor(Math.random() * 1000);
      const newRecurringTodo: Todo = {
        ...todo,
        id: newId,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: undefined,
        dueDate: getNextDueDate(todo.dueDate, todo.recurring),
        pomodoroStartTime: undefined,
        pomodoroDuration: undefined,
        pomodoroPaused: undefined,
        pomodoroTimeRemaining: undefined,
        pomodoroIsBreak: undefined,
        pomodoroCount: 0,
        subtasks: todo.subtasks?.map((st, idx) => ({
          ...st,
          id: newId + idx + 1,
          completed: false
        })),
      };

      setTodos([
        ...todos.map((t) =>
          t.id === id
            ? { ...t, completed: true, completedAt: new Date().toISOString(), recurring: undefined }
            : t
        ),
        newRecurringTodo,
      ]);
    } else {
      setTodos(
        todos.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: !t.completed,
                completedAt: !t.completed ? new Date().toISOString() : undefined,
              }
            : t
        )
      );
    }
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const restoreTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id
          ? { ...todo, completed: false, completedAt: undefined }
          : todo
      )
    );
  };

  const clearAllCompleted = () => {
    if (confirm("Are you sure you want to permanently delete all completed tasks?")) {
      setTodos(todos.filter((todo) => !todo.completed));
    }
  };

  // Subtask functions
  const addSubtask = (todoId: number) => {
    const text = subtaskInput[todoId]?.trim();
    if (!text) return;

    setTodos(
      todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              subtasks: [
                ...(todo.subtasks || []),
                { id: Date.now(), text, completed: false },
              ],
            }
          : todo
      )
    );
    setSubtaskInput({ ...subtaskInput, [todoId]: "" });
  };

  const toggleSubtask = (todoId: number, subtaskId: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              subtasks: todo.subtasks?.map((st) =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
              ),
            }
          : todo
      )
    );
  };

  const deleteSubtask = (todoId: number, subtaskId: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              subtasks: todo.subtasks?.filter((st) => st.id !== subtaskId),
            }
          : todo
      )
    );
  };

  const startEditingNotes = (id: number, notes: string) => {
    setEditingNotesId(id);
    setNotesInput(notes);
  };

  const saveNotes = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, notes: notesInput } : todo
      )
    );
    setEditingNotesId(null);
    setNotesInput("");
  };

  const cancelNotesEdit = () => {
    setEditingNotesId(null);
    setNotesInput("");
  };

  const addTagToNewTask = () => {
    if (tagInput.trim() === "" || newTags.includes(tagInput.trim())) return;
    setNewTags([...newTags, tagInput.trim()]);
    setTagInput("");
  };

  const removeTagFromNewTask = (tag: string) => {
    setNewTags(newTags.filter((t) => t !== tag));
  };

  const addTagToTask = (todoId: number) => {
    const input = tagInputForTask[todoId]?.trim();
    if (!input) return;

    setTodos(
      todos.map((todo) =>
        todo.id === todoId && !todo.tags?.includes(input)
          ? { ...todo, tags: [...(todo.tags || []), input] }
          : todo
      )
    );
    setTagInputForTask({ ...tagInputForTask, [todoId]: "" });
  };

  const removeTagFromTask = (todoId: number, tag: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId
          ? { ...todo, tags: todo.tags?.filter((t) => t !== tag) }
          : todo
      )
    );
  };

  const updateTimeEstimate = (todoId: number, minutes: number | undefined) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId ? { ...todo, timeEstimate: minutes } : todo
      )
    );
  };

  const startEditing = (id: number, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = (id: number) => {
    if (editText.trim() === "") return;

    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, text: editText } : todo
      )
    );
    setEditingId(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const startPomodoro = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              pomodoroStartTime: Date.now(),
              pomodoroDuration: 25 * 60 * 1000, // 25 minutes in milliseconds
              pomodoroPaused: false,
              pomodoroTimeRemaining: undefined,
              pomodoroIsBreak: false,
              pomodoroCount: todo.pomodoroCount ?? 0, // Initialize to 0 if undefined
            }
          : todo
      )
    );
  };

  const pausePomodoro = (id: number) => {
    setTodos(
      todos.map((todo) => {
        if (todo.id === id && todo.pomodoroStartTime) {
          const elapsed = Date.now() - todo.pomodoroStartTime;
          const remaining = (todo.pomodoroDuration || 0) - elapsed;
          return {
            ...todo,
            pomodoroPaused: true,
            pomodoroTimeRemaining: remaining,
          };
        }
        return todo;
      })
    );
  };

  const resumePomodoro = (id: number) => {
    setTodos(
      todos.map((todo) => {
        if (todo.id === id && todo.pomodoroPaused) {
          return {
            ...todo,
            pomodoroStartTime: Date.now(),
            pomodoroDuration: todo.pomodoroTimeRemaining,
            pomodoroPaused: false,
            pomodoroTimeRemaining: undefined,
          };
        }
        return todo;
      })
    );
  };

  const resetPomodoro = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              pomodoroStartTime: undefined,
              pomodoroDuration: undefined,
              pomodoroPaused: undefined,
              pomodoroTimeRemaining: undefined,
              pomodoroIsBreak: undefined,
              pomodoroCount: 0, // Reset cycle count
            }
          : todo
      )
    );
  };

  const getTimeRemaining = (todo: Todo): number => {
    if (!todo.pomodoroStartTime || !todo.pomodoroDuration) return 0;
    if (todo.pomodoroPaused && todo.pomodoroTimeRemaining !== undefined) {
      return todo.pomodoroTimeRemaining;
    }
    const elapsed = currentTime - todo.pomodoroStartTime;
    const remaining = todo.pomodoroDuration - elapsed;
    return Math.max(0, remaining);
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Parse date string as local time (not UTC)
  const parseLocalDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00");
  };

  const formatDueDate = (date: string) => {
    const dueDate = parseLocalDate(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dueDate.getTime() === today.getTime()) return "Today";
    if (dueDate.getTime() === tomorrow.getTime()) return "Tomorrow";
    return dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isOverdue = (date: string) => {
    const dueDate = parseLocalDate(date);
    dueDate.setHours(23, 59, 59, 999);
    return dueDate < new Date();
  };

  const getPriorityColor = (priority: Priority, isDark: boolean) => {
    const colors = {
      high: isDark ? "text-red-400" : "text-red-600",
      medium: isDark ? "text-yellow-400" : "text-yellow-600",
      low: isDark ? "text-blue-400" : "text-blue-600",
    };
    return colors[priority];
  };

  const getPriorityBg = (priority: Priority, isDark: boolean) => {
    const colors = {
      high: isDark ? "bg-red-900/30" : "bg-red-50",
      medium: isDark ? "bg-yellow-900/30" : "bg-yellow-50",
      low: isDark ? "bg-blue-900/30" : "bg-blue-50",
    };
    return colors[priority];
  };

  // Drag and drop handlers
  const handleDragStart = (id: number) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) return;

    const draggedIndex = todos.findIndex((t) => t.id === draggedId);
    const targetIndex = todos.findIndex((t) => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newTodos = [...todos];
    const [draggedTodo] = newTodos.splice(draggedIndex, 1);
    newTodos.splice(targetIndex, 0, draggedTodo);

    // Update order values
    const reorderedTodos = newTodos.map((todo, index) => ({
      ...todo,
      order: index,
    }));

    setTodos(reorderedTodos);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  // Statistics calculations
  const getStats = () => {
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

  // Export functions
  const exportToObsidian = () => {
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

  const exportToJSON = () => {
    return JSON.stringify(todos, null, 2);
  };

  const downloadExport = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromJSON = (jsonString: string) => {
    try {
      const imported = JSON.parse(jsonString) as Todo[];
      setTodos(imported);
      setShowExportModal(false);
    } catch {
      alert("Invalid JSON format");
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      importFromJSON(content);
    };
    reader.readAsText(file);
  };

  // Filter by category
  const activeTodos = todos
    .filter((todo) => !todo.completed)
    .filter((todo) => filterCategory === "all" || todo.category === filterCategory)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const completedTodos = todos
    .filter((todo) => todo.completed)
    .filter((todo) => filterCategory === "all" || todo.category === filterCategory);

  return (
    <div className={`min-h-screen py-12 px-4 transition-colors ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-2xl shadow-xl p-8 transition-colors ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          <div className="flex justify-between items-center mb-8">
            <h1 className={`text-4xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
              Todo List
            </h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-yellow-400" : "bg-gray-200 hover:bg-gray-300 text-gray-600"}`}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex gap-2">
              <input
                id="new-task-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a new task... (press N to focus)"
                className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "border-gray-300"}`}
              />
              <button
                onClick={addTodo}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
              >
                Add
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Priority)}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
              >
                <option value="high">High priority</option>
                <option value="medium">Medium priority</option>
                <option value="low">Low priority</option>
              </select>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
              >
                <option value="">No category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>@{cat}</option>
                ))}
              </select>
              <select
                value={newRecurring}
                onChange={(e) => setNewRecurring(e.target.value as RecurringType | "")}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
              >
                <option value="">Not recurring</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <input
                type="number"
                min="1"
                placeholder="Est. mins"
                value={newTimeEstimate}
                onChange={(e) => setNewTimeEstimate(e.target.value ? parseInt(e.target.value) : "")}
                className={`w-24 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "border-gray-300"}`}
              />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTagToNewTask())}
                className={`px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "border-gray-300"}`}
              />
              <button
                type="button"
                onClick={addTagToNewTask}
                className={`px-2 py-1.5 rounded-lg text-sm ${darkMode ? "bg-gray-600 hover:bg-gray-500 text-gray-300" : "bg-gray-200 hover:bg-gray-300"}`}
              >
                +
              </button>
              {newTags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-700"}`}
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTagFromNewTask(tag)}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Filter:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
              >
                <option value="all">All categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>@{cat}</option>
                ))}
              </select>
              <button
                onClick={() => setShowStatsModal(true)}
                className={`ml-auto px-3 py-2 rounded-lg text-sm transition-colors ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-600"}`}
              >
                Stats
              </button>
              <button
                onClick={() => setShowArchive(!showArchive)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${showArchive ? (darkMode ? "bg-purple-600 text-white" : "bg-purple-500 text-white") : (darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-600")}`}
              >
                {showArchive ? "← Back" : "Archive"}
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-600"}`}
              >
                Export/Import
              </button>
            </div>
          </div>

          {/* Archive View */}
          {showArchive ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`text-sm font-semibold uppercase tracking-wide ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Archived Tasks ({completedTodos.length})
                </h2>
                {completedTodos.length > 0 && (
                  <button
                    onClick={clearAllCompleted}
                    className={`px-3 py-1 text-sm rounded transition-colors ${darkMode ? "text-red-400 hover:bg-gray-700" : "text-red-500 hover:bg-red-50"}`}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {completedTodos.length === 0 ? (
                <div className={`text-center py-12 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  <p className="text-lg">No archived tasks</p>
                  <p className="text-sm mt-1">Completed tasks will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {completedTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`p-4 rounded-xl transition-all ${darkMode ? "bg-gray-700/50" : "bg-gray-100"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {todo.category && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${darkMode ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
                                @{todo.category}
                              </span>
                            )}
                            <span className={`line-through ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{todo.text}</span>
                            {todo.tags?.map((tag) => (
                              <span
                                key={tag}
                                className={`text-xs px-2 py-0.5 rounded ${darkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"}`}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                          <div className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                            Completed {todo.completedAt ? new Date(todo.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
                          </div>
                          {todo.notes && (
                            <div className={`text-sm mt-2 whitespace-pre-wrap ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              {todo.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => restoreTodo(todo.id)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${darkMode ? "text-green-400 hover:bg-gray-600" : "text-green-600 hover:bg-green-50"}`}
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${darkMode ? "text-red-400 hover:bg-gray-600" : "text-red-500 hover:bg-red-50"}`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
          <div className="space-y-6">
            {activeTodos.length > 0 && (
              <div>
                <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Active Tasks ({activeTodos.length})
                </h2>
                <div className="space-y-2">
                  {activeTodos.map((todo) => {
                    const hasActiveTimer = todo.pomodoroStartTime && !todo.pomodoroPaused;
                    const timeRemaining = getTimeRemaining(todo);
                    const isTimerRunning = hasActiveTimer && timeRemaining > 0;
                    const isBreak = todo.pomodoroIsBreak;
                    const overdue = todo.dueDate && isOverdue(todo.dueDate) && !todo.completed;

                    const subtaskProgress = todo.subtasks?.length
                      ? `${todo.subtasks.filter((st) => st.completed).length}/${todo.subtasks.length}`
                      : null;

                    return (
                      <div
                        key={todo.id}
                        draggable
                        onDragStart={() => handleDragStart(todo.id)}
                        onDragOver={(e) => handleDragOver(e, todo.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedTaskId(todo.id)}
                        className={`p-4 rounded-lg transition-colors cursor-grab active:cursor-grabbing ${
                          draggedId === todo.id ? "opacity-50" : ""
                        } ${
                          selectedTaskId === todo.id
                            ? "ring-2 ring-blue-500"
                            : ""
                        } ${
                          todo.priority
                            ? getPriorityBg(todo.priority, darkMode)
                            : darkMode
                            ? "bg-gray-700 hover:bg-gray-600"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`cursor-grab ${darkMode ? "text-gray-500" : "text-gray-400"}`}>⋮⋮</div>
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => toggleTodo(todo.id)}
                            className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            {editingId === todo.id ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter") saveEdit(todo.id);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                  className={`flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? "bg-gray-600 text-white" : ""}`}
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveEdit(todo.id)}
                                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {todo.category && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${darkMode ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
                                      @{todo.category}
                                    </span>
                                  )}
                                  <span className={darkMode ? "text-white" : "text-gray-800"}>{todo.text}</span>
                                  {todo.priority && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getPriorityColor(todo.priority, darkMode)}`}>
                                      {todo.priority.toUpperCase()}
                                    </span>
                                  )}
                                  {todo.recurring && (
                                    <span className={`text-xs px-2 py-0.5 rounded ${darkMode ? "bg-cyan-900/50 text-cyan-300" : "bg-cyan-100 text-cyan-700"}`}>
                                      🔄 {todo.recurring}
                                    </span>
                                  )}
                                  {subtaskProgress && (
                                    <span className={`text-xs px-2 py-0.5 rounded ${darkMode ? "bg-gray-600 text-gray-300" : "bg-gray-200 text-gray-600"}`}>
                                      ✓ {subtaskProgress}
                                    </span>
                                  )}
                                  {todo.timeEstimate && (
                                    <span className={`text-xs px-2 py-0.5 rounded ${darkMode ? "bg-amber-900/50 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
                                      ⏱ {todo.timeEstimate}m
                                    </span>
                                  )}
                                  {todo.tags?.map((tag) => (
                                    <span
                                      key={tag}
                                      className={`text-xs px-2 py-0.5 rounded ${darkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"}`}
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                                <div className={`text-xs mt-1 flex items-center gap-2 ${darkMode ? "text-gray-400" : "text-gray-400"}`}>
                                  <span>Added {formatDate(todo.createdAt)}</span>
                                  {todo.dueDate && (
                                    <span className={`font-medium ${overdue ? "text-red-500" : darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                      • Due: {formatDueDate(todo.dueDate)} {overdue && "(Overdue!)"}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          {editingId !== todo.id && (
                            <>
                              <button
                                onClick={() => startEditing(todo.id, todo.text)}
                                className={`px-3 py-1 rounded transition-colors ${darkMode ? "text-blue-400 hover:bg-gray-600" : "text-blue-500 hover:bg-blue-50"}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteTodo(todo.id)}
                                className={`px-3 py-1 rounded transition-colors ${darkMode ? "text-red-400 hover:bg-gray-600" : "text-red-500 hover:bg-red-50"}`}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>

                        {/* Notes Section */}
                        <div className={`mt-3 pt-3 border-t ${darkMode ? "border-gray-600" : "border-gray-200"}`}>
                          {editingNotesId === todo.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={notesInput}
                                onChange={(e) => setNotesInput(e.target.value)}
                                placeholder="Add notes..."
                                rows={3}
                                className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none ${darkMode ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400" : "border-gray-300"}`}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveNotes(todo.id)}
                                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelNotesEdit}
                                  className={`px-3 py-1 text-sm rounded ${darkMode ? "bg-gray-600 hover:bg-gray-500 text-gray-300" : "bg-gray-200 hover:bg-gray-300"}`}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => startEditingNotes(todo.id, todo.notes || "")}
                              className={`cursor-pointer text-sm ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
                            >
                              {todo.notes ? (
                                <p className="whitespace-pre-wrap">{todo.notes}</p>
                              ) : (
                                <p className="italic">Click to add notes...</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Tags Section */}
                        <div className={`mt-3 pt-3 border-t ${darkMode ? "border-gray-600" : "border-gray-200"}`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Tags:</span>
                            {todo.tags?.map((tag) => (
                              <span
                                key={tag}
                                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${darkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"}`}
                              >
                                #{tag}
                                <button
                                  onClick={() => removeTagFromTask(todo.id, tag)}
                                  className="hover:text-red-500"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            <input
                              type="text"
                              placeholder="Add tag..."
                              value={tagInputForTask[todo.id] || ""}
                              onChange={(e) => setTagInputForTask({ ...tagInputForTask, [todo.id]: e.target.value })}
                              onKeyPress={(e) => e.key === "Enter" && addTagToTask(todo.id)}
                              className={`px-2 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-20 ${darkMode ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400" : "border-gray-300"}`}
                            />
                            <button
                              onClick={() => addTagToTask(todo.id)}
                              className={`px-1.5 py-0.5 text-xs rounded ${darkMode ? "bg-gray-600 hover:bg-gray-500 text-gray-300" : "bg-gray-200 hover:bg-gray-300"}`}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Time Estimate Section */}
                        <div className={`mt-3 pt-3 border-t ${darkMode ? "border-gray-600" : "border-gray-200"}`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Time estimate:</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="mins"
                              value={todo.timeEstimate || ""}
                              onChange={(e) => updateTimeEstimate(todo.id, e.target.value ? parseInt(e.target.value) : undefined)}
                              className={`px-2 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-16 ${darkMode ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400" : "border-gray-300"}`}
                            />
                            <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>minutes</span>
                          </div>
                        </div>

                        {/* Subtasks Section */}
                        {(todo.subtasks?.length || 0) > 0 && (
                          <div className={`mt-3 pt-3 border-t ${darkMode ? "border-gray-600" : "border-gray-200"}`}>
                            <div className="space-y-1">
                              {todo.subtasks?.map((st) => (
                                <div key={st.id} className="flex items-center gap-2 ml-6">
                                  <input
                                    type="checkbox"
                                    checked={st.completed}
                                    onChange={() => toggleSubtask(todo.id, st.id)}
                                    className="w-4 h-4 text-blue-500 rounded focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className={`text-sm ${st.completed ? "line-through" : ""} ${darkMode ? (st.completed ? "text-gray-500" : "text-gray-300") : (st.completed ? "text-gray-400" : "text-gray-600")}`}>
                                    {st.text}
                                  </span>
                                  <button
                                    onClick={() => deleteSubtask(todo.id, st.id)}
                                    className={`text-xs px-1 rounded ${darkMode ? "text-red-400 hover:bg-gray-600" : "text-red-500 hover:bg-red-50"}`}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add Subtask Input */}
                        <div className={`mt-2 ml-6 flex gap-2`}>
                          <input
                            type="text"
                            value={subtaskInput[todo.id] || ""}
                            onChange={(e) => setSubtaskInput({ ...subtaskInput, [todo.id]: e.target.value })}
                            onKeyPress={(e) => e.key === "Enter" && addSubtask(todo.id)}
                            placeholder="Add subtask..."
                            className={`flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400" : "border-gray-300"}`}
                          />
                          <button
                            onClick={() => addSubtask(todo.id)}
                            className={`px-2 py-1 text-sm rounded ${darkMode ? "bg-gray-600 hover:bg-gray-500 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-600"}`}
                          >
                            +
                          </button>
                        </div>

                        {/* Pomodoro Timer Section */}
                        <div className={`mt-3 pt-3 border-t ${darkMode ? "border-gray-600" : "border-gray-200"}`}>
                          {!todo.pomodoroStartTime && (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => startPomodoro(todo.id)}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold"
                              >
                                Start Pomodoro (25 min)
                              </button>
                              {(todo.pomodoroCount !== undefined && todo.pomodoroCount > 0) && (
                                <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                  Cycle {todo.pomodoroCount}/4
                                </span>
                              )}
                            </div>
                          )}

                          {(todo.pomodoroStartTime || todo.pomodoroPaused) && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-xs font-semibold uppercase tracking-wide ${
                                        isBreak ? "text-blue-600" : "text-green-600"
                                      }`}
                                    >
                                      {isBreak ? "Break Time" : "Focus Time"}
                                    </span>
                                    {!isBreak && todo.pomodoroCount !== undefined && (
                                      <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                        • Cycle {todo.pomodoroCount + 1}/4
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className={`text-2xl font-bold ${
                                      isTimerRunning
                                        ? isBreak
                                          ? "text-blue-600"
                                          : "text-green-600"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {formatTime(timeRemaining)}
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                {isTimerRunning && (
                                  <button
                                    onClick={() => pausePomodoro(todo.id)}
                                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm"
                                  >
                                    Pause
                                  </button>
                                )}

                                {todo.pomodoroPaused && (
                                  <button
                                    onClick={() => resumePomodoro(todo.id)}
                                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                                  >
                                    Resume
                                  </button>
                                )}

                                <button
                                  onClick={() => resetPomodoro(todo.id)}
                                  className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
                                >
                                  Reset
                                </button>
                              </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {completedTodos.length > 0 && (
              <div>
                <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Completed Tasks ({completedTodos.length})
                </h2>
                <div className="space-y-2">
                  {completedTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`flex items-center gap-3 p-4 rounded-lg transition-colors ${darkMode ? "bg-green-900/30 hover:bg-green-900/40" : "bg-green-50 hover:bg-green-100"}`}
                    >
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                        className="w-5 h-5 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <div className="flex-1">
                        {editingId === todo.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") saveEdit(todo.id);
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className={`flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? "bg-gray-600 text-white" : ""}`}
                              autoFocus
                            />
                            <button
                              onClick={() => saveEdit(todo.id)}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className={`line-through ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              {todo.text}
                            </div>
                            <div className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                              Completed {todo.completedAt && formatDate(todo.completedAt)}
                            </div>
                          </>
                        )}
                      </div>
                      {editingId !== todo.id && (
                        <>
                          <button
                            onClick={() => startEditing(todo.id, todo.text)}
                            className={`px-3 py-1 rounded transition-colors ${darkMode ? "text-blue-400 hover:bg-gray-600" : "text-blue-500 hover:bg-blue-50"}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className={`px-3 py-1 rounded transition-colors ${darkMode ? "text-red-400 hover:bg-gray-600" : "text-red-500 hover:bg-red-50"}`}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {todos.length === 0 && (
              <div className={`text-center py-12 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                <p className="text-lg">No tasks yet. Add one above to get started!</p>
              </div>
            )}
          </div>
          )}

          {/* Documentation / Tips */}
          <div className={`mt-8 pt-6 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
            <details className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              <summary className="cursor-pointer hover:text-blue-500 font-medium">Keyboard Shortcuts & Tips</summary>
              <div className="mt-3 space-y-2 ml-4">
                <p><kbd className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>N</kbd> — Focus new task input</p>
                <p><kbd className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>↑</kbd> <kbd className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>↓</kbd> or <kbd className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>J</kbd> <kbd className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>K</kbd> — Navigate tasks</p>
                <p><kbd className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>Space</kbd> — Start/pause pomodoro timer on selected task</p>
                <p><kbd className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>Enter</kbd> — Complete selected task</p>
                <p><kbd className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>Delete</kbd> — Delete selected task</p>
                <p><kbd className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>E</kbd> — Open export/import modal</p>
                <p><kbd className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>S</kbd> — Open statistics dashboard</p>
                <p><kbd className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>A</kbd> — Toggle archive view</p>
                <p><kbd className={`px-1.5 py-0.5 rounded text-xs ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>Esc</kbd> — Deselect task / close modal</p>
                <div className="mt-3 pt-3 border-t border-dashed">
                  <p className="font-medium mb-1">Tips:</p>
                  <p>• Drag tasks using the ⋮⋮ handle to reorder</p>
                  <p>• Click a task to select it for keyboard control</p>
                  <p>• Add #tags to organize and find tasks quickly</p>
                  <p>• Set time estimates to plan your day</p>
                  <p>• Click &quot;Add notes...&quot; on any task to add detailed notes</p>
                  <p>• Recurring tasks auto-create the next instance when completed</p>
                  <p>• Pomodoro: 25min work → 5min break → repeat 4x → 15min long break</p>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Export/Import Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowExportModal(false)}>
          <div
            className={`rounded-xl p-6 max-w-lg w-full mx-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>Export / Import</h2>

            <div className="space-y-4">
              <div>
                <h3 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Export</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadExport(exportToObsidian(), "todos.md")}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                  >
                    Obsidian Markdown
                  </button>
                  <button
                    onClick={() => downloadExport(exportToJSON(), "todos.json")}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    JSON
                  </button>
                </div>
              </div>

              <div>
                <h3 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Import (JSON)</h3>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className={`block w-full text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                />
              </div>

              <div className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                <p className="font-medium">Obsidian format example:</p>
                <pre className={`mt-1 p-2 rounded text-xs overflow-x-auto ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
{`- [ ] @work 📅 2024-06-01 Task text
- [x] @home Task done ✅ 2024-06-24`}
                </pre>
              </div>
            </div>

            <button
              onClick={() => setShowExportModal(false)}
              className={`mt-4 w-full py-2 rounded-lg transition-colors ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-600"}`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      {showStatsModal && (() => {
        const stats = getStats();
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowStatsModal(false)}>
            <div
              className={`rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto ${darkMode ? "bg-gray-800" : "bg-white"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>Statistics Dashboard</h2>

              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                  <div className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>{stats.active}</div>
                  <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Active Tasks</div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? "bg-green-900/50" : "bg-green-100"}`}>
                  <div className={`text-2xl font-bold ${darkMode ? "text-green-300" : "text-green-700"}`}>{stats.completedToday}</div>
                  <div className={`text-xs ${darkMode ? "text-green-400" : "text-green-600"}`}>Completed Today</div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? "bg-blue-900/50" : "bg-blue-100"}`}>
                  <div className={`text-2xl font-bold ${darkMode ? "text-blue-300" : "text-blue-700"}`}>{stats.completedThisWeek}</div>
                  <div className={`text-xs ${darkMode ? "text-blue-400" : "text-blue-600"}`}>Completed This Week</div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? "bg-purple-900/50" : "bg-purple-100"}`}>
                  <div className={`text-2xl font-bold ${darkMode ? "text-purple-300" : "text-purple-700"}`}>{stats.completionRate}%</div>
                  <div className={`text-xs ${darkMode ? "text-purple-400" : "text-purple-600"}`}>Completion Rate</div>
                </div>
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <div className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                  <div className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>{stats.totalPomodoros}</div>
                  <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Pomodoros Completed</div>
                  <div className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>{stats.pomodoroMinutes} minutes focused</div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? "bg-amber-900/50" : "bg-amber-100"}`}>
                  <div className={`text-xl font-bold ${darkMode ? "text-amber-300" : "text-amber-700"}`}>{stats.totalTimeEstimate}m</div>
                  <div className={`text-xs ${darkMode ? "text-amber-400" : "text-amber-600"}`}>Est. Time Remaining</div>
                </div>
                {stats.overdue > 0 && (
                  <div className={`p-3 rounded-lg ${darkMode ? "bg-red-900/50" : "bg-red-100"}`}>
                    <div className={`text-xl font-bold ${darkMode ? "text-red-300" : "text-red-700"}`}>{stats.overdue}</div>
                    <div className={`text-xs ${darkMode ? "text-red-400" : "text-red-600"}`}>Overdue Tasks</div>
                  </div>
                )}
              </div>

              {/* By Priority */}
              <div className="mb-6">
                <h3 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Active by Priority</h3>
                <div className="flex gap-2">
                  <div className={`flex-1 p-2 rounded text-center ${darkMode ? "bg-red-900/50" : "bg-red-100"}`}>
                    <div className={`font-bold ${darkMode ? "text-red-300" : "text-red-700"}`}>{stats.byPriority.high}</div>
                    <div className={`text-xs ${darkMode ? "text-red-400" : "text-red-600"}`}>High</div>
                  </div>
                  <div className={`flex-1 p-2 rounded text-center ${darkMode ? "bg-yellow-900/50" : "bg-yellow-100"}`}>
                    <div className={`font-bold ${darkMode ? "text-yellow-300" : "text-yellow-700"}`}>{stats.byPriority.medium}</div>
                    <div className={`text-xs ${darkMode ? "text-yellow-400" : "text-yellow-600"}`}>Medium</div>
                  </div>
                  <div className={`flex-1 p-2 rounded text-center ${darkMode ? "bg-green-900/50" : "bg-green-100"}`}>
                    <div className={`font-bold ${darkMode ? "text-green-300" : "text-green-700"}`}>{stats.byPriority.low}</div>
                    <div className={`text-xs ${darkMode ? "text-green-400" : "text-green-600"}`}>Low</div>
                  </div>
                </div>
              </div>

              {/* By Category */}
              {Object.keys(stats.byCategory).length > 0 && (
                <div className="mb-6">
                  <h3 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Active by Category</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.byCategory).map(([cat, count]) => (
                      <div key={cat} className={`px-3 py-1 rounded-full text-sm ${darkMode ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
                        @{cat}: {count}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By Tag */}
              {Object.keys(stats.byTag).length > 0 && (
                <div className="mb-6">
                  <h3 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Active by Tag</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.byTag).map(([tag, count]) => (
                      <div key={tag} className={`px-3 py-1 rounded-full text-sm ${darkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
                        #{tag}: {count}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Time */}
              <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Total tasks tracked: {stats.total} ({stats.completed} completed)
              </div>

              <button
                onClick={() => setShowStatsModal(false)}
                className={`mt-4 w-full py-2 rounded-lg transition-colors ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-600"}`}
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
