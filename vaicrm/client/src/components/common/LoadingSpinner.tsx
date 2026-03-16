import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export const LoadingSpinner = ({ size = "md", text }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className={`animate-spin ${sizeClasses[size]} text-blue-500 mb-2`} />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
};