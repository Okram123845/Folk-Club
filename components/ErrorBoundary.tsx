import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <div className="text-6xl mb-4">😵</div>
            <h1 className="text-2xl font-bold text-roBlue mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">The application encountered an unexpected error.</p>
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs text-left overflow-auto max-h-32 mb-6 font-mono">
              {this.state.error?.message}
            </div>
            <button 
              onClick={() => {
                localStorage.clear(); 
                window.location.reload();
              }}
              className="bg-roBlue text-white px-6 py-3 rounded-full font-bold hover:bg-blue-900 transition-colors w-full"
            >
              Clear Data & Reload
            </button>
            <p className="text-xs text-gray-400 mt-4">
              Clicking this will reset local data (Demo Mode) to fix corrupted state.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;