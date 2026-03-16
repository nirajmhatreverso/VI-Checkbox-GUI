
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getStatusColor, getStatusIcon } from '@shared/utils';


export interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function StatusBadge({
  status,
  showIcon = true,
  variant,
  size = 'default',
  className = '',
}: StatusBadgeProps) {
  const statusColor = getStatusColor(status);
  const iconName = getStatusIcon(status);
  // Dynamically import only the needed icon for tree-shaking
  const [Icon, setIcon] = React.useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    if (iconName) {
      import('lucide-react').then((icons) => {
        if (isMounted) {
          const ImportedIcon = icons[iconName as keyof typeof icons];
          // Only set if it's a valid React component (has displayName or render)
          if (
            ImportedIcon &&
            (typeof ImportedIcon === 'function' ||
              (typeof ImportedIcon === 'object' && ImportedIcon !== null && 'render' in ImportedIcon))
          ) {
            setIcon(ImportedIcon as React.ComponentType<any>);
          } else {
            setIcon(null);
          }
        }
      });
    } else {
      setIcon(null);
    }
    return () => {
      isMounted = false;
    };
  }, [iconName]);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    default: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant={variant || 'secondary'}
      className={`${statusColor} ${sizeClasses[size]} ${className} flex items-center space-x-1`}
    >
  {showIcon && Icon && <Icon className="h-3 w-3" />}
      <span className="capitalize">{status}</span>
    </Badge>
  );
}