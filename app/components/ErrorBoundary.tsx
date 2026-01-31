"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <h3 className="font-semibold mb-2">Something went wrong</h3>
          <p className="text-sm mb-3">{this.state.error?.message || "An unexpected error occurred"}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 rounded transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface TaskErrorFallbackProps {
  darkMode: boolean;
  onRetry: () => void;
}

export function TaskErrorFallback({ darkMode, onRetry }: TaskErrorFallbackProps) {
  return (
    <div className={`p-4 rounded-lg ${darkMode ? "bg-red-900/30 border-red-800 text-red-300" : "bg-red-50 border border-red-200 text-red-700"}`}>
      <h3 className="font-semibold mb-2">Failed to load tasks</h3>
      <p className="text-sm mb-3">There was a problem displaying your tasks.</p>
      <button
        onClick={onRetry}
        className={`px-3 py-1 text-sm rounded transition-colors ${darkMode ? "bg-red-800 hover:bg-red-700" : "bg-red-100 hover:bg-red-200"}`}
      >
        Retry
      </button>
    </div>
  );
}

interface ModalErrorFallbackProps {
  darkMode: boolean;
  onClose: () => void;
}

export function ModalErrorFallback({ darkMode, onClose }: ModalErrorFallbackProps) {
  return (
    <div className={`p-6 rounded-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white"}`}>
      <h3 className={`font-semibold mb-2 ${darkMode ? "text-red-400" : "text-red-600"}`}>
        Something went wrong
      </h3>
      <p className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
        This feature encountered an error.
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
      >
        Close
      </button>
    </div>
  );
}
