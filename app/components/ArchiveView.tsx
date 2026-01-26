import { Todo } from "../types";

interface ArchiveViewProps {
  todos: Todo[];
  darkMode: boolean;
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
  onTagClick?: (tag: string) => void;
}

export function ArchiveView({ todos, darkMode, onRestore, onDelete, onClearAll, onTagClick }: ArchiveViewProps) {
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Archived Tasks ({completedTodos.length})
        </h2>
        {completedTodos.length > 0 && (
          <button
            onClick={onClearAll}
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
                    <span className={`line-through ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {todo.text}
                    </span>
                    {todo.tags?.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => onTagClick?.(tag)}
                        className={`text-xs px-2 py-0.5 rounded cursor-pointer hover:ring-1 hover:ring-blue-400 transition-all ${darkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"}`}
                        title={`Filter by #${tag}`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                  <div className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                    Completed {todo.completedAt ? new Date(todo.completedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    }) : ""}
                  </div>
                  {todo.notes && (
                    <div className={`text-sm mt-2 whitespace-pre-wrap ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {todo.notes}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onRestore(todo.id)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${darkMode ? "text-green-400 hover:bg-gray-600" : "text-green-600 hover:bg-green-50"}`}
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => onDelete(todo.id)}
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
  );
}
