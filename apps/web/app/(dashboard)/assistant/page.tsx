import { SparklesIcon } from '@/common/icons';

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center h-full">
      <SparklesIcon className="w-24 h-24 text-primary/30" />
      <div>
        <h2 className="text-foreground text-2xl font-semibold">AI Assistant</h2>
        <p className="text-foreground/50 text-sm mt-2">
          Your smart finance assistant is coming soon.
        </p>
      </div>
    </div>
  );
}
