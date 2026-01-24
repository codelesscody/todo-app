import { Stats } from "../types";

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: Stats;
  darkMode: boolean;
}

export function StatsModal({ isOpen, onClose, stats, darkMode }: StatsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto ${darkMode ? "bg-gray-800" : "bg-white"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>
          Statistics Dashboard
        </h2>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
            <div className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
              {stats.active}
            </div>
            <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Active Tasks
            </div>
          </div>
          <div className={`p-3 rounded-lg ${darkMode ? "bg-green-900/50" : "bg-green-100"}`}>
            <div className={`text-2xl font-bold ${darkMode ? "text-green-300" : "text-green-700"}`}>
              {stats.completedToday}
            </div>
            <div className={`text-xs ${darkMode ? "text-green-400" : "text-green-600"}`}>
              Completed Today
            </div>
          </div>
          <div className={`p-3 rounded-lg ${darkMode ? "bg-blue-900/50" : "bg-blue-100"}`}>
            <div className={`text-2xl font-bold ${darkMode ? "text-blue-300" : "text-blue-700"}`}>
              {stats.completedThisWeek}
            </div>
            <div className={`text-xs ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
              Completed This Week
            </div>
          </div>
          <div className={`p-3 rounded-lg ${darkMode ? "bg-purple-900/50" : "bg-purple-100"}`}>
            <div className={`text-2xl font-bold ${darkMode ? "text-purple-300" : "text-purple-700"}`}>
              {stats.completionRate}%
            </div>
            <div className={`text-xs ${darkMode ? "text-purple-400" : "text-purple-600"}`}>
              Completion Rate
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
            <div className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
              {stats.totalPomodoros}
            </div>
            <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Pomodoros Completed
            </div>
            <div className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              {stats.pomodoroMinutes} minutes focused
            </div>
          </div>
          <div className={`p-3 rounded-lg ${darkMode ? "bg-amber-900/50" : "bg-amber-100"}`}>
            <div className={`text-xl font-bold ${darkMode ? "text-amber-300" : "text-amber-700"}`}>
              {stats.totalTimeEstimate}m
            </div>
            <div className={`text-xs ${darkMode ? "text-amber-400" : "text-amber-600"}`}>
              Est. Time Remaining
            </div>
          </div>
          {stats.overdue > 0 && (
            <div className={`p-3 rounded-lg ${darkMode ? "bg-red-900/50" : "bg-red-100"}`}>
              <div className={`text-xl font-bold ${darkMode ? "text-red-300" : "text-red-700"}`}>
                {stats.overdue}
              </div>
              <div className={`text-xs ${darkMode ? "text-red-400" : "text-red-600"}`}>
                Overdue Tasks
              </div>
            </div>
          )}
        </div>

        {/* By Priority */}
        <div className="mb-6">
          <h3 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Active by Priority
          </h3>
          <div className="flex gap-2">
            <div className={`flex-1 p-2 rounded text-center ${darkMode ? "bg-red-900/50" : "bg-red-100"}`}>
              <div className={`font-bold ${darkMode ? "text-red-300" : "text-red-700"}`}>
                {stats.byPriority.high}
              </div>
              <div className={`text-xs ${darkMode ? "text-red-400" : "text-red-600"}`}>High</div>
            </div>
            <div className={`flex-1 p-2 rounded text-center ${darkMode ? "bg-yellow-900/50" : "bg-yellow-100"}`}>
              <div className={`font-bold ${darkMode ? "text-yellow-300" : "text-yellow-700"}`}>
                {stats.byPriority.medium}
              </div>
              <div className={`text-xs ${darkMode ? "text-yellow-400" : "text-yellow-600"}`}>Medium</div>
            </div>
            <div className={`flex-1 p-2 rounded text-center ${darkMode ? "bg-green-900/50" : "bg-green-100"}`}>
              <div className={`font-bold ${darkMode ? "text-green-300" : "text-green-700"}`}>
                {stats.byPriority.low}
              </div>
              <div className={`text-xs ${darkMode ? "text-green-400" : "text-green-600"}`}>Low</div>
            </div>
          </div>
        </div>

        {/* By Category */}
        {Object.keys(stats.byCategory).length > 0 && (
          <div className="mb-6">
            <h3 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Active by Category
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCategory).map(([cat, count]) => (
                <div
                  key={cat}
                  className={`px-3 py-1 rounded-full text-sm ${darkMode ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700"}`}
                >
                  @{cat}: {count}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By Tag */}
        {Object.keys(stats.byTag).length > 0 && (
          <div className="mb-6">
            <h3 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Active by Tag
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTag).map(([tag, count]) => (
                <div
                  key={tag}
                  className={`px-3 py-1 rounded-full text-sm ${darkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"}`}
                >
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
          onClick={onClose}
          className={`mt-4 w-full py-2 rounded-lg transition-colors ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-600"}`}
        >
          Close
        </button>
      </div>
    </div>
  );
}
