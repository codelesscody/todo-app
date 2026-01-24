import { Todo } from "../types";
import { formatDate, formatDueDate, isOverdue, getPriorityColor, getPriorityBg, formatTime } from "../utils";

interface TaskCardProps {
  todo: Todo;
  darkMode: boolean;
  isSelected: boolean;
  draggedId: number | null;
  editingId: number | null;
  editText: string;
  editingNotesId: number | null;
  notesInput: string;
  subtaskInput: string;
  tagInput: string;
  handlers: {
    onSelect: (id: number) => void;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
    onDragStart: (id: number) => void;
    onDragOver: (e: React.DragEvent, id: number) => void;
    onDragEnd: () => void;
    onStartEditing: (id: number, text: string) => void;
    onSaveEdit: (id: number) => void;
    onCancelEdit: () => void;
    onEditTextChange: (text: string) => void;
    onStartEditingNotes: (id: number, notes: string) => void;
    onSaveNotes: (id: number) => void;
    onCancelNotesEdit: () => void;
    onNotesInputChange: (notes: string) => void;
    onSubtaskInputChange: (todoId: number, value: string) => void;
    onAddSubtask: (todoId: number) => void;
    onToggleSubtask: (todoId: number, subtaskId: number) => void;
    onDeleteSubtask: (todoId: number, subtaskId: number) => void;
    onTagInputChange: (todoId: number, value: string) => void;
    onAddTag: (todoId: number) => void;
    onRemoveTag: (todoId: number, tag: string) => void;
    onUpdateTimeEstimate: (todoId: number, minutes: number | undefined) => void;
    onStartPomodoro: (id: number) => void;
    onPausePomodoro: (id: number) => void;
    onResumePomodoro: (id: number) => void;
    onResetPomodoro: (id: number) => void;
    getTimeRemaining: (todo: Todo) => number;
  };
}

export function TaskCard({
  todo,
  darkMode,
  isSelected,
  draggedId,
  editingId,
  editText,
  editingNotesId,
  notesInput,
  subtaskInput,
  tagInput,
  handlers,
}: TaskCardProps) {
  const hasActiveTimer = todo.pomodoroStartTime && !todo.pomodoroPaused;
  const timeRemaining = handlers.getTimeRemaining(todo);
  const isTimerRunning = hasActiveTimer && timeRemaining > 0;
  const isBreak = todo.pomodoroIsBreak;
  const overdue = todo.dueDate && isOverdue(todo.dueDate) && !todo.completed;

  const subtaskProgress = todo.subtasks?.length
    ? `${todo.subtasks.filter((st) => st.completed).length}/${todo.subtasks.length}`
    : null;

  return (
    <div
      draggable
      onDragStart={() => handlers.onDragStart(todo.id)}
      onDragOver={(e) => handlers.onDragOver(e, todo.id)}
      onDragEnd={handlers.onDragEnd}
      onClick={() => handlers.onSelect(todo.id)}
      className={`p-4 rounded-lg transition-colors cursor-grab active:cursor-grabbing ${
        draggedId === todo.id ? "opacity-50" : ""
      } ${
        isSelected ? "ring-2 ring-blue-500" : ""
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
          onChange={() => handlers.onToggle(todo.id)}
          className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex-1">
          {editingId === todo.id ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => handlers.onEditTextChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handlers.onSaveEdit(todo.id);
                  if (e.key === "Escape") handlers.onCancelEdit();
                }}
                className={`flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? "bg-gray-600 text-white" : ""}`}
                autoFocus
              />
              <button
                onClick={() => handlers.onSaveEdit(todo.id)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handlers.onCancelEdit}
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
              onClick={() => handlers.onStartEditing(todo.id, todo.text)}
              className={`px-3 py-1 rounded transition-colors ${darkMode ? "text-blue-400 hover:bg-gray-600" : "text-blue-500 hover:bg-blue-50"}`}
            >
              Edit
            </button>
            <button
              onClick={() => handlers.onDelete(todo.id)}
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
              onChange={(e) => handlers.onNotesInputChange(e.target.value)}
              placeholder="Add notes..."
              rows={3}
              className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none ${darkMode ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400" : "border-gray-300"}`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handlers.onSaveNotes(todo.id)}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
              <button
                onClick={handlers.onCancelNotesEdit}
                className={`px-3 py-1 text-sm rounded ${darkMode ? "bg-gray-600 hover:bg-gray-500 text-gray-300" : "bg-gray-200 hover:bg-gray-300"}`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => handlers.onStartEditingNotes(todo.id, todo.notes || "")}
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
                onClick={() => handlers.onRemoveTag(todo.id, tag)}
                className="hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder="Add tag..."
            value={tagInput}
            onChange={(e) => handlers.onTagInputChange(todo.id, e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handlers.onAddTag(todo.id)}
            className={`px-2 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-20 ${darkMode ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400" : "border-gray-300"}`}
          />
          <button
            onClick={() => handlers.onAddTag(todo.id)}
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
            onChange={(e) => handlers.onUpdateTimeEstimate(todo.id, e.target.value ? parseInt(e.target.value) : undefined)}
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
                  onChange={() => handlers.onToggleSubtask(todo.id, st.id)}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-1 focus:ring-blue-500"
                />
                <span className={`text-sm ${st.completed ? "line-through" : ""} ${darkMode ? (st.completed ? "text-gray-500" : "text-gray-300") : (st.completed ? "text-gray-400" : "text-gray-600")}`}>
                  {st.text}
                </span>
                <button
                  onClick={() => handlers.onDeleteSubtask(todo.id, st.id)}
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
          value={subtaskInput}
          onChange={(e) => handlers.onSubtaskInputChange(todo.id, e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handlers.onAddSubtask(todo.id)}
          placeholder="Add subtask..."
          className={`flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400" : "border-gray-300"}`}
        />
        <button
          onClick={() => handlers.onAddSubtask(todo.id)}
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
              onClick={() => handlers.onStartPomodoro(todo.id)}
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
                    onClick={() => handlers.onPausePomodoro(todo.id)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm"
                  >
                    Pause
                  </button>
                )}

                {todo.pomodoroPaused && (
                  <button
                    onClick={() => handlers.onResumePomodoro(todo.id)}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                  >
                    Resume
                  </button>
                )}

                <button
                  onClick={() => handlers.onResetPomodoro(todo.id)}
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
}
