"use client";

import { useState, useEffect } from "react";

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
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  // Load todos on mount
  useEffect(() => {
    const loadTodos = async () => {
      try {
        const response = await fetch("/api/todos");
        if (response.ok) {
          const data = await response.json();
          setTodos(data);
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
        await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(todos),
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

  const addTodo = () => {
    if (input.trim() === "") return;

    const newTodo: Todo = {
      id: Date.now(),
      text: input,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setTodos([...todos, newTodo]);
    setInput("");
  };

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              completed: !todo.completed,
              completedAt: !todo.completed ? new Date().toISOString() : undefined,
            }
          : todo
      )
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
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

  const activeTodos = todos.filter((todo) => !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
            Todo List
          </h1>

          <div className="flex gap-2 mb-8">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a new task..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addTodo}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
            >
              Add
            </button>
          </div>

          <div className="space-y-6">
            {activeTodos.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Active Tasks ({activeTodos.length})
                </h2>
                <div className="space-y-2">
                  {activeTodos.map((todo) => {
                    const hasActiveTimer = todo.pomodoroStartTime && !todo.pomodoroPaused;
                    const timeRemaining = getTimeRemaining(todo);
                    const isTimerRunning = hasActiveTimer && timeRemaining > 0;
                    const isBreak = todo.pomodoroIsBreak;

                    return (
                      <div
                        key={todo.id}
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
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
                                  className="flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                <div className="text-gray-800">{todo.text}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Added {formatDate(todo.createdAt)}
                                </div>
                              </>
                            )}
                          </div>
                          {editingId !== todo.id && (
                            <>
                              <button
                                onClick={() => startEditing(todo.id, todo.text)}
                                className="px-3 py-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteTodo(todo.id)}
                                className="px-3 py-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>

                        {/* Pomodoro Timer Section */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          {!todo.pomodoroStartTime && (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => startPomodoro(todo.id)}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold"
                              >
                                Start Pomodoro (25 min)
                              </button>
                              {(todo.pomodoroCount !== undefined && todo.pomodoroCount > 0) && (
                                <span className="text-xs text-gray-500 font-medium">
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
                                      <span className="text-xs text-gray-500 font-medium">
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
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Completed Tasks ({completedTodos.length})
                </h2>
                <div className="space-y-2">
                  {completedTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
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
                              className="flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            <div className="text-gray-500 line-through">
                              {todo.text}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Completed {todo.completedAt && formatDate(todo.completedAt)}
                            </div>
                          </>
                        )}
                      </div>
                      {editingId !== todo.id && (
                        <>
                          <button
                            onClick={() => startEditing(todo.id, todo.text)}
                            className="px-3 py-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="px-3 py-1 text-red-500 hover:bg-red-50 rounded transition-colors"
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
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">No tasks yet. Add one above to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
