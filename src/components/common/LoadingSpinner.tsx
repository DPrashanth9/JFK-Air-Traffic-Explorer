interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}
