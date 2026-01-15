import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const TODOS_FILE = path.join(process.cwd(), "todos.md");

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
            id: Date.now() + todos.length,
            text: match[2],
            completed: match[1] === "x",
          };
        }
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
      markdown += "\n";
    });
  }

  if (completedTodos.length > 0) {
    markdown += "## Completed Tasks\n\n";
    completedTodos.forEach((todo) => {
      markdown += `## [x] ${todo.text}\n`;
      markdown += `- **Created:** ${todo.createdAt}\n`;
      if (todo.completedAt) {
        markdown += `- **Completed:** ${todo.completedAt}\n`;
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
