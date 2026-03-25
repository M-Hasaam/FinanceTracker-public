'use client';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({
  message = 'Setting up test data...',
}: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-foreground shadow-xl">
        <span className="inline-block size-5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}
