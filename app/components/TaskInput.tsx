import { useState } from "react";
import { Priority, RecurringType, CATEGORIES } from "../types";
import { getTodayDateString } from "../utils";

interface TaskInputProps {
  onAddTodo: (
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
  darkMode: boolean;
}

export function TaskInput({ onAddTodo, darkMode }: TaskInputProps) {
  const [input, setInput] = useState("");
  const [newDueDate, setNewDueDate] = useState(getTodayDateString);
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newCategory, setNewCategory] = useState("");
  const [newRecurring, setNewRecurring] = useState<RecurringType | "">("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [newTimeEstimate, setNewTimeEstimate] = useState<number | "">("");

  const handleAddTodo = () => {
    if (input.trim() === "") return;

    onAddTodo(input, {
      dueDate: newDueDate || undefined,
      priority: newPriority || undefined,
      category: newCategory || undefined,
      recurring: newRecurring || undefined,
      tags: newTags.length > 0 ? newTags : undefined,
      timeEstimate: newTimeEstimate ? Number(newTimeEstimate) : undefined,
    });

    // Reset form
    setInput("");
    setNewDueDate(getTodayDateString());
    setNewPriority("medium");
    setNewCategory("");
    setNewRecurring("");
    setNewTags([]);
    setTagInput("");
    setNewTimeEstimate("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTodo();
    }
  };

  const addTagToNewTask = () => {
    if (tagInput.trim() === "" || newTags.includes(tagInput.trim())) return;
    setNewTags([...newTags, tagInput.trim()]);
    setTagInput("");
  };

  const removeTagFromNewTask = (tag: string) => {
    setNewTags(newTags.filter((t) => t !== tag));
  };

  return (
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
          onClick={handleAddTodo}
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
    </div>
  );
}
