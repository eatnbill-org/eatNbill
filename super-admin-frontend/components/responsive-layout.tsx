'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn('w-full overflow-auto', className)}>
      <div className="min-w-[800px]">
        {children}
      </div>
    </div>
  );
}

interface MobileCardViewProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
}

export function MobileCardView<T>({ 
  data, 
  renderCard, 
  keyExtractor, 
  emptyState 
}: MobileCardViewProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-3 lg:hidden">
      {data.map((item, index) => (
        <React.Fragment key={keyExtractor(item)}>
          {renderCard(item, index)}
        </React.Fragment>
      ))}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn(
      'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
      className
    )}>
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn(
      'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
      className
    )}>
      {children}
    </div>
  );
}

interface StatCardsGridProps {
  children: React.ReactNode;
  className?: string;
}

export function StatCardsGrid({ children, className }: StatCardsGridProps) {
  return (
    <div className={cn(
      'grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      className
    )}>
      {children}
    </div>
  );
}

interface ContentGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 6 | 7 | 12;
}

export function ContentGrid({ children, className, cols = 2 }: ContentGridProps) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    7: 'grid-cols-1 lg:grid-cols-7',
    12: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4 sm:gap-6', colsClass[cols], className)}>
      {children}
    </div>
  );
}
