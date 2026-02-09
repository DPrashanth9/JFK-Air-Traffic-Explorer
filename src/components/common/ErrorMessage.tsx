interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryCount?: number;
  maxRetries?: number;
}

export function ErrorMessage({ message, onRetry, retryCount = 0, maxRetries = 3 }: ErrorMessageProps) {
  const isNetworkError = message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network');
  const isServerError = message.toLowerCase().includes('500') || message.toLowerCase().includes('503');
  
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-900/20 rounded-lg border border-red-500/30">
      <div className="w-12 h-12 mb-4 flex items-center justify-center">
        <svg className="w-full h-full text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-red-400 font-medium mb-2 text-lg">Error loading data</p>
      <p className="text-red-300 text-sm mb-4 text-center max-w-md">{message}</p>
      
      {isNetworkError && (
        <p className="text-yellow-400 text-xs mb-4 text-center max-w-md">
          ⚠️ Network connection issue. Please check your internet connection.
        </p>
      )}
      
      {isServerError && (
        <p className="text-yellow-400 text-xs mb-4 text-center max-w-md">
          ⚠️ Server is temporarily unavailable. Please try again in a moment.
        </p>
      )}
      
      {onRetry && retryCount < maxRetries && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg hover:shadow-xl"
        >
          Retry {retryCount > 0 && `(${retryCount}/${maxRetries})`}
        </button>
      )}
      
      {retryCount >= maxRetries && (
        <p className="text-gray-400 text-xs mt-2 text-center">
          Maximum retry attempts reached. Please refresh the page.
        </p>
      )}
      
      <p className="text-xs text-gray-500 mt-4 text-center">
        If the problem persists, check that the backend server is running.
      </p>
    </div>
  );
}
