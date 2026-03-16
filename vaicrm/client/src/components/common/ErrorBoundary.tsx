import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  error?: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export const ErrorBoundary = ({ 
  error, 
  onRetry, 
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again."
}: ErrorBoundaryProps) => {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-red-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-gray-600 mb-4">{description}</p>
        {error && (
          <details className="text-left mb-4">
            <summary className="cursor-pointer text-sm text-gray-500 mb-2">
              Error details
            </summary>
            <pre className="text-xs text-gray-700 bg-gray-50 p-2 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};