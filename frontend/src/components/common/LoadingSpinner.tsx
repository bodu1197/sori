import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  readonly size?: number;
  readonly className?: string;
}

export default function LoadingSpinner({ size = 24, className = '' }: LoadingSpinnerProps) {
  return <Loader2 size={size} className={`animate-spin text-gray-400 ${className}`} />;
}

export function CenteredSpinner({ size = 24 }: { readonly size?: number }) {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner size={size} />
    </div>
  );
}
