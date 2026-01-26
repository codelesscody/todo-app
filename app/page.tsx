"use client";

import { useState, useEffect } from "react";
import { useTodos } from "./hooks/useTodos";
import { CATEGORIES } from "./types";
import { formatDate } from "./utils";
import { TaskInput } from "./components/TaskInput";
import { TaskCard } from "./components/TaskCard";
import { ArchiveView } from "./components/ArchiveView";
import { StatsModal } from "./components/StatsModal";
import { ExportModal } from "./components/ExportModal";
import { UndoToast } from "./components/UndoToast";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const todoState = useTodos();

  // Get all unique tags from todos
  const allTags = Array.from(
    new Set(todoState.todos.flatMap((todo) => todo.tags || []))
  ).sort();

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return;
      }

      const activeList = todoState.todos
        .filter((t) => !t.completed)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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
        const todo = todoState.todos.find((t) => t.id === selectedTaskId);
        if (todo) {
          if (todo.pomodoroStartTime && !todo.pomodoroPaused) {
            todoState.pausePomodoro(selectedTaskId);
          } else if (todo.pomodoroPaused) {
            todoState.resumePomodoro(selectedTaskId);
          } else {
            todoState.startPomodoro(selectedTaskId);
          }
        }
        return;
      }

      // Enter: Complete selected task
      if (e.key === "Enter" && selectedTaskId) {
        e.preventDefault();
        todoState.toggleTodo(selectedTaskId);
        return;
      }

      // Delete or Backspace: Delete selected task
      if ((e.key === "Delete" || e.key === "Backspace") && selectedTaskId) {
        e.preventDefault();
        todoState.deleteTodo(selectedTaskId);
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
  }, [todoState, selectedTaskId]);

  // Filter by category and tag
  const activeTodos = todoState.todos
    .filter((todo) => !todo.completed)
    .filter((todo) => filterCategory === "all" || todo.category === filterCategory)
    .filter((todo) => filterTag === "all" || todo.tags?.includes(filterTag))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const completedTodos = todoState.todos
    .filter((todo) => todo.completed)
    .filter((todo) => filterCategory === "all" || todo.category === filterCategory)
    .filter((todo) => filterTag === "all" || todo.tags?.includes(filterTag));

  // Create handlers object for TaskCard
  const taskCardHandlers = {
    onSelect: setSelectedTaskId,
    onToggle: todoState.toggleTodo,
    onDelete: todoState.deleteTodo,
    onDragStart: todoState.handleDragStart,
    onDragOver: todoState.handleDragOver,
    onDragEnd: todoState.handleDragEnd,
    onStartEditing: todoState.startEditing,
    onSaveEdit: todoState.saveEdit,
    onCancelEdit: todoState.cancelEdit,
    onEditTextChange: todoState.setEditText,
    onStartEditingNotes: todoState.startEditingNotes,
    onSaveNotes: todoState.saveNotes,
    onCancelNotesEdit: todoState.cancelNotesEdit,
    onNotesInputChange: todoState.setNotesInput,
    onSubtaskInputChange: (todoId: number, value: string) =>
      todoState.setSubtaskInput((prev) => ({ ...prev, [todoId]: value })),
    onAddSubtask: todoState.addSubtask,
    onToggleSubtask: todoState.toggleSubtask,
    onDeleteSubtask: todoState.deleteSubtask,
    onTagInputChange: (todoId: number, value: string) =>
      todoState.setTagInputForTask((prev) => ({ ...prev, [todoId]: value })),
    onAddTag: todoState.addTagToTask,
    onRemoveTag: todoState.removeTagFromTask,
    onTagClick: (tag: string) => setFilterTag(tag),
    onUpdateTimeEstimate: todoState.updateTimeEstimate,
    onStartPomodoro: todoState.startPomodoro,
    onPausePomodoro: todoState.pausePomodoro,
    onResumePomodoro: todoState.resumePomodoro,
    onResetPomodoro: todoState.resetPomodoro,
    getTimeRemaining: todoState.getTimeRemaining,
  };

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

          <TaskInput onAddTodo={todoState.addTodo} darkMode={darkMode} />

          {/* Filter and action buttons */}
          <div className="flex gap-2 items-center flex-wrap mb-6">
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
            {allTags.length > 0 && (
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
              >
                <option value="all">All tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>#{tag}</option>
                ))}
              </select>
            )}
            {(filterCategory !== "all" || filterTag !== "all") && (
              <button
                onClick={() => { setFilterCategory("all"); setFilterTag("all"); }}
                className={`px-2 py-1 text-xs rounded transition-colors ${darkMode ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"}`}
              >
                Clear filters
              </button>
            )}
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

          {/* Archive View */}
          {showArchive ? (
            <ArchiveView
              todos={todoState.todos
                .filter((todo) => filterCategory === "all" || todo.category === filterCategory)
                .filter((todo) => filterTag === "all" || todo.tags?.includes(filterTag))}
              darkMode={darkMode}
              onRestore={todoState.restoreTodo}
              onDelete={todoState.deleteTodo}
              onClearAll={todoState.clearAllCompleted}
              onTagClick={(tag) => setFilterTag(tag)}
            />
          ) : (
            <div className="space-y-6">
              {activeTodos.length > 0 && (
                <div>
                  <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Active Tasks ({activeTodos.length})
                  </h2>
                  <div className="space-y-2">
                    {activeTodos.map((todo) => (
                      <TaskCard
                        key={todo.id}
                        todo={todo}
                        darkMode={darkMode}
                        isSelected={selectedTaskId === todo.id}
                        draggedId={todoState.draggedId}
                        editingId={todoState.editingId}
                        editText={todoState.editText}
                        editingNotesId={todoState.editingNotesId}
                        notesInput={todoState.notesInput}
                        subtaskInput={todoState.subtaskInput[todo.id] || ""}
                        tagInput={todoState.tagInputForTask[todo.id] || ""}
                        handlers={taskCardHandlers}
                      />
                    ))}
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
                          onChange={() => todoState.toggleTodo(todo.id)}
                          className="w-5 h-5 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <div className="flex-1">
                          {todoState.editingId === todo.id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={todoState.editText}
                                onChange={(e) => todoState.setEditText(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") todoState.saveEdit(todo.id);
                                  if (e.key === "Escape") todoState.cancelEdit();
                                }}
                                className={`flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? "bg-gray-600 text-white" : ""}`}
                                autoFocus
                              />
                              <button
                                onClick={() => todoState.saveEdit(todo.id)}
                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={todoState.cancelEdit}
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
                        {todoState.editingId !== todo.id && (
                          <>
                            <button
                              onClick={() => todoState.startEditing(todo.id, todo.text)}
                              className={`px-3 py-1 rounded transition-colors ${darkMode ? "text-blue-400 hover:bg-gray-600" : "text-blue-500 hover:bg-blue-50"}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => todoState.deleteTodo(todo.id)}
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

              {todoState.todos.length === 0 && (
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
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        todos={todoState.todos}
        onImport={todoState.importFromJSON}
        darkMode={darkMode}
      />

      {/* Undo Delete Toast */}
      {todoState.showUndoToast && todoState.deletedTodo && (
        <UndoToast
          todo={todoState.deletedTodo}
          onUndo={todoState.undoDelete}
          onDismiss={todoState.dismissUndoToast}
          darkMode={darkMode}
        />
      )}

      {/* Statistics Modal */}
      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        stats={todoState.getStats()}
        darkMode={darkMode}
      />
    </div>
  );
}
