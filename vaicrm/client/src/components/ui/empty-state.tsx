// === EMPTY STATE COMPONENT ===
// Reusable empty state component for different scenarios

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@shared/utils';

export interface EmptyStateProps {
  icon?: string | LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = 'FileX',
  title,
  description,
  action,
  children,
  className = '',
}: EmptyStateProps) {
  const IconComponent = typeof icon === 'string' 
    ? Icons[icon as keyof typeof Icons] as LucideIcon
    : icon;

  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        {IconComponent && (
          <IconComponent className="h-12 w-12 text-muted-foreground/50" />
        )}
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-muted-foreground">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground max-w-md">
              {description}
            </p>
          )}
        </div>

        {action && (
          <Button
            variant={action.variant || 'default'}
            onClick={action.onClick}
            size="sm"
          >
            {action.label}
          </Button>
        )}

        {children}
      </CardContent>
    </Card>
  );
}

// Pre-configured empty states
export function NoDataFound({ 
  title = 'No data found',
  description = 'There are no items to display at the moment.',
  onRefresh,
}: {
  title?: string;
  description?: string;
  onRefresh?: () => void;
}) {
  return (
    <EmptyState
      icon="Database"
      title={title}
      description={description}
      action={onRefresh ? {
        label: 'Refresh',
        onClick: onRefresh,
        variant: 'outline'
      } : undefined}
    />
  );
}

export function NoSearchResults({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <EmptyState
      icon="Search"
      title="No results found"
      description={`No items match your search for "${query}". Try adjusting your search terms.`}
      action={{
        label: 'Clear Search',
        onClick: onClear,
        variant: 'outline'
      }}
    />
  );
}

export function AccessDenied({
  title = 'Access Denied',
  description = 'You do not have permission to view this content.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon="Lock"
      title={title}
      description={description}
    />
  );
}

export function ComingSoon({
  title = 'Coming Soon',
  description = 'This feature is under development and will be available soon.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon="Clock"
      title={title}
      description={description}
    />
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this content.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="AlertCircle"
      title={title}
      description={description}
      action={onRetry ? {
        label: 'Try Again',
        onClick: onRetry,
        variant: 'outline'
      } : undefined}
    />
  );
}