import { renderHook, act, waitFor } from '@testing-library/react';
import { useTodos } from '../hooks/useTodos';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Notification API
const mockNotification = jest.fn();
Object.defineProperty(global, 'Notification', {
  value: mockNotification,
  writable: true,
});
(global.Notification as unknown as { permission: string }).permission = 'denied';
(global.Notification as unknown as { requestPermission: jest.Mock }).requestPermission = jest.fn();

// Mock window.confirm
global.confirm = jest.fn(() => true);

describe('useTodos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default fetch mock - return empty array
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useTodos());
      expect(result.current.isLoading).toBe(true);
    });

    it('loads todos from API on mount', async () => {
      const mockTodos = [
        { id: 1, text: 'Test', completed: false, createdAt: new Date().toISOString() },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTodos),
      });

      const { result } = renderHook(() => useTodos());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.todos).toEqual(mockTodos);
    });
  });

  describe('addTodo', () => {
    it('adds a new todo with text', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('New task');
      });

      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].text).toBe('New task');
      expect(result.current.todos[0].completed).toBe(false);
    });

    it('adds a todo with options', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Task with options', {
          priority: 'high',
          category: 'work',
          tags: ['urgent'],
          timeEstimate: 30,
        });
      });

      const todo = result.current.todos[0];
      expect(todo.priority).toBe('high');
      expect(todo.category).toBe('work');
      expect(todo.tags).toEqual(['urgent']);
      expect(todo.timeEstimate).toBe(30);
    });

    it('does not add empty todos', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('');
        result.current.addTodo('   ');
      });

      expect(result.current.todos).toHaveLength(0);
    });
  });

  describe('toggleTodo', () => {
    it('toggles todo completion status', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Test task');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.toggleTodo(todoId);
      });

      expect(result.current.todos[0].completed).toBe(true);
      expect(result.current.todos[0].completedAt).toBeDefined();
    });

    it('toggles back to incomplete', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Test task');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.toggleTodo(todoId);
        result.current.toggleTodo(todoId);
      });

      expect(result.current.todos[0].completed).toBe(false);
      expect(result.current.todos[0].completedAt).toBeUndefined();
    });

    it('creates new instance for recurring tasks', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Recurring task', {
          recurring: 'daily',
          dueDate: '2024-06-15',
        });
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.toggleTodo(todoId);
      });

      expect(result.current.todos).toHaveLength(2);
      expect(result.current.todos[0].completed).toBe(true);
      expect(result.current.todos[1].completed).toBe(false);
      expect(result.current.todos[1].dueDate).toBe('2024-06-16');
    });
  });

  describe('deleteTodo', () => {
    it('removes todo from list', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('To delete');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.deleteTodo(todoId);
      });

      expect(result.current.todos).toHaveLength(0);
    });

    it('shows undo toast after delete', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('To delete');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.deleteTodo(todoId);
      });

      expect(result.current.showUndoToast).toBe(true);
      expect(result.current.deletedTodo).not.toBeNull();
    });

    it('undoes delete when undoDelete called', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('To delete');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.deleteTodo(todoId);
      });

      act(() => {
        result.current.undoDelete();
      });

      expect(result.current.todos).toHaveLength(1);
      expect(result.current.showUndoToast).toBe(false);
    });
  });

  describe('inline editing', () => {
    it('starts editing with correct values', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Original text');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.startEditing(todoId, 'Original text');
      });

      expect(result.current.editingId).toBe(todoId);
      expect(result.current.editText).toBe('Original text');
    });

    it('saves edit correctly', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Original text');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.startEditing(todoId, 'Original text');
        result.current.setEditText('Updated text');
      });

      act(() => {
        result.current.saveEdit(todoId);
      });

      expect(result.current.todos[0].text).toBe('Updated text');
      expect(result.current.editingId).toBeNull();
    });

    it('cancels edit without saving', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Original text');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.startEditing(todoId, 'Original text');
        result.current.setEditText('Changed');
        result.current.cancelEdit();
      });

      expect(result.current.todos[0].text).toBe('Original text');
      expect(result.current.editingId).toBeNull();
    });
  });

  describe('subtasks', () => {
    it('adds subtask to todo', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Main task');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.setSubtaskInput({ [todoId]: 'Subtask 1' });
      });

      act(() => {
        result.current.addSubtask(todoId);
      });

      expect(result.current.todos[0].subtasks).toHaveLength(1);
      expect(result.current.todos[0].subtasks?.[0].text).toBe('Subtask 1');
    });

    it('toggles subtask completion', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Main task');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.setSubtaskInput({ [todoId]: 'Subtask 1' });
      });

      act(() => {
        result.current.addSubtask(todoId);
      });

      const subtaskId = result.current.todos[0].subtasks?.[0].id!;

      act(() => {
        result.current.toggleSubtask(todoId, subtaskId);
      });

      expect(result.current.todos[0].subtasks?.[0].completed).toBe(true);
    });

    it('deletes subtask', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Main task');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.setSubtaskInput({ [todoId]: 'Subtask 1' });
      });

      act(() => {
        result.current.addSubtask(todoId);
      });

      const subtaskId = result.current.todos[0].subtasks?.[0].id!;

      act(() => {
        result.current.deleteSubtask(todoId, subtaskId);
      });

      expect(result.current.todos[0].subtasks).toHaveLength(0);
    });
  });

  describe('tags', () => {
    it('adds tag to task', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Task');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.setTagInputForTask({ [todoId]: 'urgent' });
      });

      act(() => {
        result.current.addTagToTask(todoId);
      });

      expect(result.current.todos[0].tags).toContain('urgent');
    });

    it('removes tag from task', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Task', { tags: ['urgent', 'important'] });
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.removeTagFromTask(todoId, 'urgent');
      });

      expect(result.current.todos[0].tags).not.toContain('urgent');
      expect(result.current.todos[0].tags).toContain('important');
    });
  });

  describe('pomodoro', () => {
    it('starts pomodoro timer', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Task');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.startPomodoro(todoId);
      });

      expect(result.current.todos[0].pomodoroStartTime).toBeDefined();
      expect(result.current.todos[0].pomodoroDuration).toBe(25 * 60 * 1000);
      expect(result.current.todos[0].pomodoroPaused).toBe(false);
    });

    it('pauses pomodoro timer', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Task');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.startPomodoro(todoId);
      });

      act(() => {
        result.current.pausePomodoro(todoId);
      });

      expect(result.current.todos[0].pomodoroPaused).toBe(true);
      expect(result.current.todos[0].pomodoroTimeRemaining).toBeDefined();
    });

    it('resumes pomodoro timer', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Task');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.startPomodoro(todoId);
        result.current.pausePomodoro(todoId);
        result.current.resumePomodoro(todoId);
      });

      expect(result.current.todos[0].pomodoroPaused).toBe(false);
    });

    it('resets pomodoro timer', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Task');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.startPomodoro(todoId);
        result.current.resetPomodoro(todoId);
      });

      expect(result.current.todos[0].pomodoroStartTime).toBeUndefined();
      expect(result.current.todos[0].pomodoroDuration).toBeUndefined();
    });

    it('calculates time remaining correctly', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Task');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.startPomodoro(todoId);
      });

      const timeRemaining = result.current.getTimeRemaining(result.current.todos[0]);
      expect(timeRemaining).toBeGreaterThan(0);
      // Allow small timing variance due to test execution
      expect(timeRemaining).toBeLessThanOrEqual(25 * 60 * 1000 + 100);
    });
  });

  describe('archive operations', () => {
    it('restores completed todo', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Task');
      });

      const todoId = result.current.todos[0].id;

      act(() => {
        result.current.toggleTodo(todoId);
      });

      expect(result.current.todos[0].completed).toBe(true);

      act(() => {
        result.current.restoreTodo(todoId);
      });

      expect(result.current.todos[0].completed).toBe(false);
      expect(result.current.todos[0].completedAt).toBeUndefined();
    });

    it('clears all completed todos', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Add todos with time advancement to get unique IDs
      act(() => {
        result.current.addTodo('Task 1');
      });
      jest.advanceTimersByTime(1);
      act(() => {
        result.current.addTodo('Task 2');
      });
      jest.advanceTimersByTime(1);
      act(() => {
        result.current.addTodo('Task 3');
      });

      // Mark first two as completed
      act(() => {
        result.current.toggleTodo(result.current.todos[0].id);
      });
      act(() => {
        result.current.toggleTodo(result.current.todos[1].id);
      });

      act(() => {
        result.current.clearAllCompleted();
      });

      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].text).toBe('Task 3');
    });
  });

  describe('import', () => {
    it('imports valid JSON', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const todosToImport = [
        { id: 1, text: 'Imported', completed: false, createdAt: new Date().toISOString() },
      ];

      act(() => {
        const success = result.current.importFromJSON(JSON.stringify(todosToImport));
        expect(success).toBe(true);
      });

      expect(result.current.todos).toEqual(todosToImport);
    });

    it('returns false for invalid JSON', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        const success = result.current.importFromJSON('not valid json');
        expect(success).toBe(false);
      });
    });
  });

  describe('stats', () => {
    it('returns correct stats', async () => {
      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.addTodo('Task 1', { priority: 'high' });
        result.current.addTodo('Task 2', { priority: 'low' });
      });

      const stats = result.current.getStats();

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.completed).toBe(0);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.low).toBe(1);
    });
  });
});
