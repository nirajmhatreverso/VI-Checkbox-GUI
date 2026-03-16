import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface QueryErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function QueryErrorFallback({ error, resetErrorBoundary }: QueryErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto" />
          <div>
            <h3 className="font-medium text-gray-900">Unable to load data</h3>
            <p className="text-sm text-gray-600 mt-1">
              {error?.message || 'Something went wrong while fetching data'}
            </p>
          </div>
          <Button onClick={resetErrorBoundary} size="sm" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Simplified error display for inline use
export function InlineErrorMessage({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-center p-4 text-center">
      <div className="space-y-2">
        <AlertTriangle className="w-6 h-6 text-orange-500 mx-auto" />
        <p className="text-sm text-gray-600">{error.message}</p>
        {onRetry && (
          <Button onClick={onRetry} size="sm" variant="outline">
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}