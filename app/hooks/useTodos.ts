"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Todo, Priority, RecurringType, Stats } from "../types";
import { getNextDueDate, getTodayDateString, playNotificationSound, calculateStats } from "../utils";

export interface UseTodosReturn {
  // State
  todos: Todo[];
  isLoading: boolean;
  currentTime: number;

  // CRUD operations
  addTodo: (
    text: string,
    options?: {
      dueDate?: string;
      priority?: Priority;
      category?: string;
      recurring?: RecurringType;
      tags?: string[];
      timeEstimate?: number;
    }
  ) => void;
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;

  // Inline editing
  editingId: number | null;
  editText: string;
  setEditText: (text: string) => void;
  startEditing: (id: number, text: string) => void;
  saveEdit: (id: number) => void;
  cancelEdit: () => void;

  // Subtasks
  subtaskInput: { [key: number]: string };
  setSubtaskInput: React.Dispatch<React.SetStateAction<{ [key: number]: string }>>;
  addSubtask: (todoId: number) => void;
  toggleSubtask: (todoId: number, subtaskId: number) => void;
  deleteSubtask: (todoId: number, subtaskId: number) => void;

  // Notes
  editingNotesId: number | null;
  notesInput: string;
  setNotesInput: (notes: string) => void;
  startEditingNotes: (id: number, notes: string) => void;
  saveNotes: (id: number) => void;
  cancelNotesEdit: () => void;

  // Tags
  tagInputForTask: { [key: number]: string };
  setTagInputForTask: React.Dispatch<React.SetStateAction<{ [key: number]: string }>>;
  addTagToTask: (todoId: number) => void;
  removeTagFromTask: (todoId: number, tag: string) => void;

  // Time estimates
  updateTimeEstimate: (todoId: number, minutes: number | undefined) => void;

  // Archive operations
  restoreTodo: (id: number) => void;
  clearAllCompleted: () => void;

  // Pomodoro
  startPomodoro: (id: number) => void;
  pausePomodoro: (id: number) => void;
  resumePomodoro: (id: number) => void;
  resetPomodoro: (id: number) => void;
  getTimeRemaining: (todo: Todo) => number;

  // Drag and drop
  draggedId: number | null;
  handleDragStart: (id: number) => void;
  handleDragOver: (e: React.DragEvent, targetId: number) => void;
  handleDragEnd: () => void;

  // Undo
  deletedTodo: Todo | null;
  showUndoToast: boolean;
  undoDelete: () => void;
  dismissUndoToast: () => void;

  // Stats
  getStats: () => Stats;

  // Import
  importFromJSON: (jsonString: string) => boolean;
}

export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  // Notes editing state
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesInput, setNotesInput] = useState("");

  // Subtask input state
  const [subtaskInput, setSubtaskInput] = useState<{ [key: number]: string }>({});

  // Tag input state
  const [tagInputForTask, setTagInputForTask] = useState<{ [key: number]: string }>({});

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<number | null>(null);

  // Undo state
  const [deletedTodo, setDeletedTodo] = useState<Todo | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);

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

  // Cleanup undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  // CRUD operations
  const addTodo = useCallback((
    text: string,
    options?: {
      dueDate?: string;
      priority?: Priority;
      category?: string;
      recurring?: RecurringType;
      tags?: string[];
      timeEstimate?: number;
    }
  ) => {
    if (text.trim() === "") return;

    setTodos((prev) => {
      const maxOrder = Math.max(0, ...prev.map((t) => t.order ?? 0));
      const newTodo: Todo = {
        id: Date.now(),
        text,
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: options?.dueDate || getTodayDateString(),
        priority: options?.priority,
        order: maxOrder + 1,
        category: options?.category,
        recurring: options?.recurring,
        tags: options?.tags?.length ? options.tags : undefined,
        timeEstimate: options?.timeEstimate,
      };
      return [...prev, newTodo];
    });
  }, []);

  const toggleTodo = useCallback((id: number) => {
    setTodos((prev) => {
      const todo = prev.find((t) => t.id === id);
      if (!todo) return prev;

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

        return [
          ...prev.map((t) =>
            t.id === id
              ? { ...t, completed: true, completedAt: new Date().toISOString(), recurring: undefined }
              : t
          ),
          newRecurringTodo,
        ];
      } else {
        return prev.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: !t.completed,
                completedAt: !t.completed ? new Date().toISOString() : undefined,
              }
            : t
        );
      }
    });
  }, []);

  const deleteTodo = useCallback((id: number) => {
    const todoToDelete = todos.find((todo) => todo.id === id);
    if (!todoToDelete) return;

    // Clear any existing undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Store the deleted todo for potential undo
    setDeletedTodo(todoToDelete);
    setShowUndoToast(true);

    // Remove from list
    setTodos((prev) => prev.filter((todo) => todo.id !== id));

    // Auto-dismiss toast after 5 seconds
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndoToast(false);
      setDeletedTodo(null);
    }, 5000);
  }, [todos]);

  // Undo operations
  const undoDelete = useCallback(() => {
    if (deletedTodo) {
      setTodos((prev) => [...prev, deletedTodo]);
      setDeletedTodo(null);
      setShowUndoToast(false);
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    }
  }, [deletedTodo]);

  const dismissUndoToast = useCallback(() => {
    setShowUndoToast(false);
    setDeletedTodo(null);
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
  }, []);

  // Archive operations
  const restoreTodo = useCallback((id: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? { ...todo, completed: false, completedAt: undefined }
          : todo
      )
    );
  }, []);

  const clearAllCompleted = useCallback(() => {
    if (confirm("Are you sure you want to permanently delete all completed tasks?")) {
      setTodos((prev) => prev.filter((todo) => !todo.completed));
    }
  }, []);

  // Subtask operations
  const addSubtask = useCallback((todoId: number) => {
    const text = subtaskInput[todoId]?.trim();
    if (!text) return;

    setTodos((prev) =>
      prev.map((todo) =>
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
    setSubtaskInput((prev) => ({ ...prev, [todoId]: "" }));
  }, [subtaskInput]);

  const toggleSubtask = useCallback((todoId: number, subtaskId: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
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
  }, []);

  const deleteSubtask = useCallback((todoId: number, subtaskId: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              subtasks: todo.subtasks?.filter((st) => st.id !== subtaskId),
            }
          : todo
      )
    );
  }, []);

  // Notes operations
  const startEditingNotes = useCallback((id: number, notes: string) => {
    setEditingNotesId(id);
    setNotesInput(notes);
  }, []);

  const saveNotes = useCallback((id: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, notes: notesInput } : todo
      )
    );
    setEditingNotesId(null);
    setNotesInput("");
  }, [notesInput]);

  const cancelNotesEdit = useCallback(() => {
    setEditingNotesId(null);
    setNotesInput("");
  }, []);

  // Tag operations
  const addTagToTask = useCallback((todoId: number) => {
    const input = tagInputForTask[todoId]?.trim();
    if (!input) return;

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === todoId && !todo.tags?.includes(input)
          ? { ...todo, tags: [...(todo.tags || []), input] }
          : todo
      )
    );
    setTagInputForTask((prev) => ({ ...prev, [todoId]: "" }));
  }, [tagInputForTask]);

  const removeTagFromTask = useCallback((todoId: number, tag: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === todoId
          ? { ...todo, tags: todo.tags?.filter((t) => t !== tag) }
          : todo
      )
    );
  }, []);

  // Time estimate operations
  const updateTimeEstimate = useCallback((todoId: number, minutes: number | undefined) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === todoId ? { ...todo, timeEstimate: minutes } : todo
      )
    );
  }, []);

  // Inline editing operations
  const startEditing = useCallback((id: number, text: string) => {
    setEditingId(id);
    setEditText(text);
  }, []);

  const saveEdit = useCallback((id: number) => {
    if (editText.trim() === "") return;

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, text: editText } : todo
      )
    );
    setEditingId(null);
    setEditText("");
  }, [editText]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText("");
  }, []);

  // Pomodoro operations
  const startPomodoro = useCallback((id: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
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
  }, []);

  const pausePomodoro = useCallback((id: number) => {
    setTodos((prev) =>
      prev.map((todo) => {
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
  }, []);

  const resumePomodoro = useCallback((id: number) => {
    setTodos((prev) =>
      prev.map((todo) => {
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
  }, []);

  const resetPomodoro = useCallback((id: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
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
  }, []);

  const getTimeRemaining = useCallback((todo: Todo): number => {
    if (!todo.pomodoroStartTime || !todo.pomodoroDuration) return 0;
    if (todo.pomodoroPaused && todo.pomodoroTimeRemaining !== undefined) {
      return todo.pomodoroTimeRemaining;
    }
    const elapsed = currentTime - todo.pomodoroStartTime;
    const remaining = todo.pomodoroDuration - elapsed;
    return Math.max(0, remaining);
  }, [currentTime]);

  // Drag and drop operations
  const handleDragStart = useCallback((id: number) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) return;

    setTodos((prev) => {
      const draggedIndex = prev.findIndex((t) => t.id === draggedId);
      const targetIndex = prev.findIndex((t) => t.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newTodos = [...prev];
      const [draggedTodo] = newTodos.splice(draggedIndex, 1);
      newTodos.splice(targetIndex, 0, draggedTodo);

      // Update order values
      return newTodos.map((todo, index) => ({
        ...todo,
        order: index,
      }));
    });
  }, [draggedId]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  // Statistics
  const getStats = useCallback((): Stats => {
    return calculateStats(todos);
  }, [todos]);

  // Import
  const importFromJSON = useCallback((jsonString: string): boolean => {
    try {
      const imported = JSON.parse(jsonString) as Todo[];
      setTodos(imported);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    // State
    todos,
    isLoading,
    currentTime,

    // CRUD operations
    addTodo,
    toggleTodo,
    deleteTodo,

    // Inline editing
    editingId,
    editText,
    setEditText,
    startEditing,
    saveEdit,
    cancelEdit,

    // Subtasks
    subtaskInput,
    setSubtaskInput,
    addSubtask,
    toggleSubtask,
    deleteSubtask,

    // Notes
    editingNotesId,
    notesInput,
    setNotesInput,
    startEditingNotes,
    saveNotes,
    cancelNotesEdit,

    // Tags
    tagInputForTask,
    setTagInputForTask,
    addTagToTask,
    removeTagFromTask,

    // Time estimates
    updateTimeEstimate,

    // Archive operations
    restoreTodo,
    clearAllCompleted,

    // Pomodoro
    startPomodoro,
    pausePomodoro,
    resumePomodoro,
    resetPomodoro,
    getTimeRemaining,

    // Drag and drop
    draggedId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,

    // Undo
    deletedTodo,
    showUndoToast,
    undoDelete,
    dismissUndoToast,

    // Stats
    getStats,

    // Import
    importFromJSON,
  };
}
