import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly position?: 'center' | 'bottom';
  readonly showCloseButton?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  position = 'center',
  showCloseButton = true,
}: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  const positionClasses = {
    center: 'items-center justify-center',
    bottom: 'items-end sm:items-center justify-center',
  };

  const roundedClasses = {
    center: 'rounded-xl',
    bottom: 'rounded-t-xl sm:rounded-xl',
  };

  return (
    <div className={`fixed inset-0 z-50 flex ${positionClasses[position]} bg-black/50`}>
      <div
        className={`bg-white dark:bg-gray-900 w-full ${sizeClasses[size]} ${roundedClasses[position]} max-h-[80vh] flex flex-col mx-4`}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            {title && <h3 className="text-lg font-semibold text-black dark:text-white">{title}</h3>}
            {!title && <div />}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
