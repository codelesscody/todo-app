import { Todo } from "../types";
import { exportToObsidian, exportToJSON, downloadExport } from "../utils";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: Todo[];
  onImport: (jsonString: string) => boolean;
  darkMode: boolean;
}

export function ExportModal({ isOpen, onClose, todos, onImport, darkMode }: ExportModalProps) {
  if (!isOpen) return null;

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = onImport(content);
      if (success) {
        onClose();
      } else {
        alert("Invalid JSON format");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`rounded-xl p-6 max-w-lg w-full mx-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>
          Export / Import
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Export
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => downloadExport(exportToObsidian(todos), "todos.md")}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
              >
                Obsidian Markdown
              </button>
              <button
                onClick={() => downloadExport(exportToJSON(todos), "todos.json")}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                JSON
              </button>
            </div>
          </div>

          <div>
            <h3 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Import (JSON)
            </h3>
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
          onClick={onClose}
          className={`mt-4 w-full py-2 rounded-lg transition-colors ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-600"}`}
        >
          Close
        </button>
      </div>
    </div>
  );
}
