import { Todo } from "../types";

interface UndoToastProps {
  todo: Todo;
  onUndo: () => void;
  onDismiss: () => void;
  darkMode: boolean;
}

export function UndoToast({ todo, onUndo, onDismiss, darkMode }: UndoToastProps) {
  const truncatedText = todo.text.length > 30
    ? todo.text.slice(0, 30) + "..."
    : todo.text;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${darkMode ? "bg-gray-700 text-white" : "bg-gray-800 text-white"}`}>
        <span className="text-sm">
          Deleted &quot;{truncatedText}&quot;
        </span>
        <button
          onClick={onUndo}
          className="px-3 py-1 text-sm font-semibold bg-blue-500 hover:bg-blue-600 rounded transition-colors"
        >
          Undo
        </button>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
