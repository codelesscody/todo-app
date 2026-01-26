import {
  formatDate,
  parseLocalDate,
  formatDueDate,
  isOverdue,
  getPriorityColor,
  getPriorityBg,
  formatTime,
  getNextDueDate,
  getTodayDateString,
  exportToObsidian,
  exportToJSON,
  calculateStats,
} from '../utils';
import { Todo } from '../types';

describe('formatDate', () => {
  it('formats ISO date string to readable format', () => {
    const result = formatDate('2024-06-15T14:30:00.000Z');
    expect(result).toMatch(/Jun 15, 2024/);
  });
});

describe('parseLocalDate', () => {
  it('parses date string as local time', () => {
    const result = parseLocalDate('2024-06-15');
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(5); // June is 0-indexed
    expect(result.getDate()).toBe(15);
  });
});

describe('formatDueDate', () => {
  it('returns "Today" for today\'s date', () => {
    const today = getTodayDateString();
    expect(formatDueDate(today)).toBe('Today');
  });

  it('returns "Tomorrow" for tomorrow\'s date', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    expect(formatDueDate(tomorrowStr)).toBe('Tomorrow');
  });

  it('returns formatted date for other dates', () => {
    const result = formatDueDate('2024-12-25');
    expect(result).toBe('Dec 25');
  });
});

describe('isOverdue', () => {
  it('returns true for past dates', () => {
    expect(isOverdue('2020-01-01')).toBe(true);
  });

  it('returns false for future dates', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = `${futureDate.getFullYear()}-01-01`;
    expect(isOverdue(futureDateStr)).toBe(false);
  });
});

describe('getPriorityColor', () => {
  it('returns correct color for high priority in light mode', () => {
    expect(getPriorityColor('high', false)).toBe('text-red-600');
  });

  it('returns correct color for high priority in dark mode', () => {
    expect(getPriorityColor('high', true)).toBe('text-red-400');
  });

  it('returns correct color for medium priority', () => {
    expect(getPriorityColor('medium', false)).toBe('text-yellow-600');
  });

  it('returns correct color for low priority', () => {
    expect(getPriorityColor('low', false)).toBe('text-blue-600');
  });
});

describe('getPriorityBg', () => {
  it('returns correct background for high priority in light mode', () => {
    expect(getPriorityBg('high', false)).toBe('bg-red-50');
  });

  it('returns correct background for high priority in dark mode', () => {
    expect(getPriorityBg('high', true)).toBe('bg-red-900/30');
  });
});

describe('formatTime', () => {
  it('formats milliseconds to MM:SS', () => {
    expect(formatTime(90000)).toBe('1:30'); // 1 minute 30 seconds
  });

  it('pads seconds with leading zero', () => {
    expect(formatTime(65000)).toBe('1:05');
  });

  it('handles zero', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('handles 25 minutes (pomodoro)', () => {
    expect(formatTime(25 * 60 * 1000)).toBe('25:00');
  });
});

describe('getNextDueDate', () => {
  it('adds one day for daily recurring', () => {
    expect(getNextDueDate('2024-06-15', 'daily')).toBe('2024-06-16');
  });

  it('adds one week for weekly recurring', () => {
    expect(getNextDueDate('2024-06-15', 'weekly')).toBe('2024-06-22');
  });

  it('adds one month for monthly recurring', () => {
    expect(getNextDueDate('2024-06-15', 'monthly')).toBe('2024-07-15');
  });

  it('handles month overflow correctly', () => {
    expect(getNextDueDate('2024-12-15', 'monthly')).toBe('2025-01-15');
  });
});

describe('getTodayDateString', () => {
  it('returns today\'s date in YYYY-MM-DD format', () => {
    const result = getTodayDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });
});

describe('exportToObsidian', () => {
  it('exports todos in Obsidian markdown format', () => {
    const todos: Todo[] = [
      {
        id: 1,
        text: 'Test task',
        completed: false,
        createdAt: '2024-06-15T10:00:00.000Z',
        category: 'work',
        dueDate: '2024-06-20',
        priority: 'high',
      },
    ];

    const result = exportToObsidian(todos);
    expect(result).toContain('- [ ]');
    expect(result).toContain('@work');
    expect(result).toContain('Test task');
    expect(result).toContain('2024-06-20');
  });

  it('marks completed tasks with [x]', () => {
    const todos: Todo[] = [
      {
        id: 1,
        text: 'Done task',
        completed: true,
        createdAt: '2024-06-15T10:00:00.000Z',
        completedAt: '2024-06-16T10:00:00.000Z',
      },
    ];

    const result = exportToObsidian(todos);
    expect(result).toContain('- [x]');
    expect(result).toContain('2024-06-16');
  });

  it('includes subtasks indented', () => {
    const todos: Todo[] = [
      {
        id: 1,
        text: 'Main task',
        completed: false,
        createdAt: '2024-06-15T10:00:00.000Z',
        subtasks: [
          { id: 2, text: 'Subtask 1', completed: false },
          { id: 3, text: 'Subtask 2', completed: true },
        ],
      },
    ];

    const result = exportToObsidian(todos);
    expect(result).toContain('  - [ ] Subtask 1');
    expect(result).toContain('  - [x] Subtask 2');
  });

  it('includes tags with # prefix', () => {
    const todos: Todo[] = [
      {
        id: 1,
        text: 'Tagged task',
        completed: false,
        createdAt: '2024-06-15T10:00:00.000Z',
        tags: ['urgent', 'project-x'],
      },
    ];

    const result = exportToObsidian(todos);
    expect(result).toContain('#urgent');
    expect(result).toContain('#project-x');
  });
});

describe('exportToJSON', () => {
  it('exports todos as formatted JSON', () => {
    const todos: Todo[] = [
      {
        id: 1,
        text: 'Test',
        completed: false,
        createdAt: '2024-06-15T10:00:00.000Z',
      },
    ];

    const result = exportToJSON(todos);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(todos);
  });
});

describe('calculateStats', () => {
  const baseTodo: Todo = {
    id: 1,
    text: 'Test',
    completed: false,
    createdAt: new Date().toISOString(),
  };

  it('counts total, active, and completed todos', () => {
    const todos: Todo[] = [
      { ...baseTodo, id: 1, completed: false },
      { ...baseTodo, id: 2, completed: false },
      { ...baseTodo, id: 3, completed: true, completedAt: new Date().toISOString() },
    ];

    const stats = calculateStats(todos);
    expect(stats.total).toBe(3);
    expect(stats.active).toBe(2);
    expect(stats.completed).toBe(1);
  });

  it('calculates completion rate', () => {
    const todos: Todo[] = [
      { ...baseTodo, id: 1, completed: false },
      { ...baseTodo, id: 2, completed: true, completedAt: new Date().toISOString() },
    ];

    const stats = calculateStats(todos);
    expect(stats.completionRate).toBe(50);
  });

  it('counts by priority', () => {
    const todos: Todo[] = [
      { ...baseTodo, id: 1, priority: 'high' },
      { ...baseTodo, id: 2, priority: 'high' },
      { ...baseTodo, id: 3, priority: 'low' },
    ];

    const stats = calculateStats(todos);
    expect(stats.byPriority.high).toBe(2);
    expect(stats.byPriority.low).toBe(1);
    expect(stats.byPriority.medium).toBe(0);
  });

  it('counts by category', () => {
    const todos: Todo[] = [
      { ...baseTodo, id: 1, category: 'work' },
      { ...baseTodo, id: 2, category: 'work' },
      { ...baseTodo, id: 3, category: 'home' },
    ];

    const stats = calculateStats(todos);
    expect(stats.byCategory.work).toBe(2);
    expect(stats.byCategory.home).toBe(1);
  });

  it('sums time estimates for active todos', () => {
    const todos: Todo[] = [
      { ...baseTodo, id: 1, timeEstimate: 30 },
      { ...baseTodo, id: 2, timeEstimate: 45 },
      { ...baseTodo, id: 3, completed: true, timeEstimate: 60 },
    ];

    const stats = calculateStats(todos);
    expect(stats.totalTimeEstimate).toBe(75); // Only active todos
  });

  it('counts overdue tasks', () => {
    const todos: Todo[] = [
      { ...baseTodo, id: 1, dueDate: '2020-01-01' }, // Overdue
      { ...baseTodo, id: 2, dueDate: '2099-01-01' }, // Not overdue
      { ...baseTodo, id: 3 }, // No due date
    ];

    const stats = calculateStats(todos);
    expect(stats.overdue).toBe(1);
  });

  it('handles empty todo list', () => {
    const stats = calculateStats([]);
    expect(stats.total).toBe(0);
    expect(stats.completionRate).toBe(0);
  });
});
