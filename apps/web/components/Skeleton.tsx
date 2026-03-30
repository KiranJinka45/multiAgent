'use client';

/**
 * Generic Skeleton Loader component with pulse animation.
 * Used to prevent layout shift during asynchronous data loading.
 */
export default function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-foreground/5 rounded-2xl ${className}`} 
      aria-hidden="true" 
    />
  );
}

/**
 * Predefined Skeleton variants for common UI patterns.
 */
export function CardSkeleton() {
  return (
    <div className="p-card border border-border/50 rounded-3xl space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export function TextSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
