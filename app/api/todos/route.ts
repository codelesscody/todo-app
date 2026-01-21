import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const TODOS_FILE = path.join(process.cwd(), "todos.md");

type Priority = "high" | "medium" | "low";
type RecurringType = "daily" | "weekly" | "monthly";

interface Subtask {
  id: number;
  text: string;
  completed: boolean;
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  pomodoroStartTime?: number;
  pomodoroDuration?: number;
  pomodoroPaused?: boolean;
  pomodoroTimeRemaining?: number;
  pomodoroIsBreak?: boolean;
  pomodoroCount?: number;
  dueDate?: string;
  priority?: Priority;
  order?: number;
  category?: string;
  subtasks?: Subtask[];
  recurring?: RecurringType;
  notes?: string;
  tags?: string[];
  timeEstimate?: number;
}

// Parse markdown file to todos
async function parseTodos(): Promise<Todo[]> {
  try {
    const content = await fs.readFile(TODOS_FILE, "utf-8");
    const todos: Todo[] = [];
    const lines = content.split("\n");

    let currentTodo: Partial<Todo> | null = null;

    for (const line of lines) {
      if (line.startsWith("## ")) {
        // Save previous todo if exists
        if (currentTodo && currentTodo.id && currentTodo.text) {
          todos.push(currentTodo as Todo);
        }

        // Start new todo
        const match = line.match(/## \[([ x])\] (.+)/);
        if (match) {
          currentTodo = {
            id: Date.now() + todos.length, // Default, will be overwritten if ID exists in file
            text: match[2],
            completed: match[1] === "x",
          };
        }
      } else if (line.startsWith("- **ID:**") && currentTodo) {
        currentTodo.id = parseInt(line.replace("- **ID:**", "").trim());
      } else if (line.startsWith("- **Created:**") && currentTodo) {
        const dateStr = line.replace("- **Created:**", "").trim();
        currentTodo.createdAt = dateStr;
      } else if (line.startsWith("- **Completed:**") && currentTodo) {
        const dateStr = line.replace("- **Completed:**", "").trim();
        currentTodo.completedAt = dateStr;
      } else if (line.startsWith("- **Pomodoro Start:**") && currentTodo) {
        const startTime = line.replace("- **Pomodoro Start:**", "").trim();
        currentTodo.pomodoroStartTime = parseInt(startTime);
      } else if (line.startsWith("- **Pomodoro Duration:**") && currentTodo) {
        const duration = line.replace("- **Pomodoro Duration:**", "").trim();
        currentTodo.pomodoroDuration = parseInt(duration);
      } else if (line.startsWith("- **Pomodoro Paused:**") && currentTodo) {
        const paused = line.replace("- **Pomodoro Paused:**", "").trim();
        currentTodo.pomodoroPaused = paused === "true";
      } else if (line.startsWith("- **Pomodoro Time Remaining:**") && currentTodo) {
        const remaining = line.replace("- **Pomodoro Time Remaining:**", "").trim();
        currentTodo.pomodoroTimeRemaining = parseInt(remaining);
      } else if (line.startsWith("- **Pomodoro Is Break:**") && currentTodo) {
        const isBreak = line.replace("- **Pomodoro Is Break:**", "").trim();
        currentTodo.pomodoroIsBreak = isBreak === "true";
      } else if (line.startsWith("- **Pomodoro Count:**") && currentTodo) {
        const count = line.replace("- **Pomodoro Count:**", "").trim();
        currentTodo.pomodoroCount = parseInt(count);
      } else if (line.startsWith("- **Due Date:**") && currentTodo) {
        currentTodo.dueDate = line.replace("- **Due Date:**", "").trim();
      } else if (line.startsWith("- **Priority:**") && currentTodo) {
        currentTodo.priority = line.replace("- **Priority:**", "").trim() as Priority;
      } else if (line.startsWith("- **Order:**") && currentTodo) {
        currentTodo.order = parseInt(line.replace("- **Order:**", "").trim());
      } else if (line.startsWith("- **Category:**") && currentTodo) {
        currentTodo.category = line.replace("- **Category:**", "").trim();
      } else if (line.startsWith("- **Recurring:**") && currentTodo) {
        currentTodo.recurring = line.replace("- **Recurring:**", "").trim() as RecurringType;
      } else if (line.startsWith("- **Subtasks:**") && currentTodo) {
        try {
          currentTodo.subtasks = JSON.parse(line.replace("- **Subtasks:**", "").trim());
        } catch {
          currentTodo.subtasks = [];
        }
      } else if (line.startsWith("- **Notes:**") && currentTodo) {
        // Notes are stored with escaped newlines
        currentTodo.notes = line.replace("- **Notes:**", "").trim().replace(/\\n/g, "\n");
      } else if (line.startsWith("- **Tags:**") && currentTodo) {
        try {
          currentTodo.tags = JSON.parse(line.replace("- **Tags:**", "").trim());
        } catch {
          currentTodo.tags = [];
        }
      } else if (line.startsWith("- **Time Estimate:**") && currentTodo) {
        currentTodo.timeEstimate = parseInt(line.replace("- **Time Estimate:**", "").trim());
      }
    }

    // Save last todo
    if (currentTodo && currentTodo.id && currentTodo.text) {
      todos.push(currentTodo as Todo);
    }

    return todos;
  } catch (error) {
    // File doesn't exist yet
    return [];
  }
}

// Convert todos to markdown
function todosToMarkdown(todos: Todo[]): string {
  let markdown = "# Todo List\n\n";

  const activeTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  if (activeTodos.length > 0) {
    markdown += "## Active Tasks\n\n";
    activeTodos.forEach((todo) => {
      markdown += `## [ ] ${todo.text}\n`;
      markdown += `- **ID:** ${todo.id}\n`;
      markdown += `- **Created:** ${todo.createdAt}\n`;
      if (todo.pomodoroStartTime) {
        markdown += `- **Pomodoro Start:** ${todo.pomodoroStartTime}\n`;
      }
      if (todo.pomodoroDuration) {
        markdown += `- **Pomodoro Duration:** ${todo.pomodoroDuration}\n`;
      }
      if (todo.pomodoroPaused !== undefined) {
        markdown += `- **Pomodoro Paused:** ${todo.pomodoroPaused}\n`;
      }
      if (todo.pomodoroTimeRemaining) {
        markdown += `- **Pomodoro Time Remaining:** ${todo.pomodoroTimeRemaining}\n`;
      }
      if (todo.pomodoroIsBreak !== undefined) {
        markdown += `- **Pomodoro Is Break:** ${todo.pomodoroIsBreak}\n`;
      }
      if (todo.pomodoroCount !== undefined) {
        markdown += `- **Pomodoro Count:** ${todo.pomodoroCount}\n`;
      }
      if (todo.dueDate) {
        markdown += `- **Due Date:** ${todo.dueDate}\n`;
      }
      if (todo.priority) {
        markdown += `- **Priority:** ${todo.priority}\n`;
      }
      if (todo.order !== undefined) {
        markdown += `- **Order:** ${todo.order}\n`;
      }
      if (todo.category) {
        markdown += `- **Category:** ${todo.category}\n`;
      }
      if (todo.recurring) {
        markdown += `- **Recurring:** ${todo.recurring}\n`;
      }
      if (todo.subtasks && todo.subtasks.length > 0) {
        markdown += `- **Subtasks:** ${JSON.stringify(todo.subtasks)}\n`;
      }
      if (todo.notes) {
        // Escape newlines to keep notes on one line
        markdown += `- **Notes:** ${todo.notes.replace(/\n/g, "\\n")}\n`;
      }
      if (todo.tags && todo.tags.length > 0) {
        markdown += `- **Tags:** ${JSON.stringify(todo.tags)}\n`;
      }
      if (todo.timeEstimate) {
        markdown += `- **Time Estimate:** ${todo.timeEstimate}\n`;
      }
      markdown += "\n";
    });
  }

  if (completedTodos.length > 0) {
    markdown += "## Completed Tasks\n\n";
    completedTodos.forEach((todo) => {
      markdown += `## [x] ${todo.text}\n`;
      markdown += `- **ID:** ${todo.id}\n`;
      markdown += `- **Created:** ${todo.createdAt}\n`;
      if (todo.completedAt) {
        markdown += `- **Completed:** ${todo.completedAt}\n`;
      }
      if (todo.notes) {
        markdown += `- **Notes:** ${todo.notes.replace(/\n/g, "\\n")}\n`;
      }
      if (todo.tags && todo.tags.length > 0) {
        markdown += `- **Tags:** ${JSON.stringify(todo.tags)}\n`;
      }
      if (todo.timeEstimate) {
        markdown += `- **Time Estimate:** ${todo.timeEstimate}\n`;
      }
      markdown += "\n";
    });
  }

  return markdown;
}

export async function GET() {
  try {
    const todos = await parseTodos();
    return NextResponse.json(todos);
  } catch (error) {
    return NextResponse.json({ error: "Failed to read todos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const todos: Todo[] = await request.json();
    const markdown = todosToMarkdown(todos);
    await fs.writeFile(TODOS_FILE, markdown, "utf-8");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save todos" }, { status: 500 });
  }
}
