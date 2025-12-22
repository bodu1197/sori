const DEFAULT_AVATAR = 'https://via.placeholder.com/150';

interface AvatarProps {
  readonly src?: string | null;
  readonly alt: string;
  readonly size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  readonly className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export default function Avatar({ src, alt, size = 'md', className = '' }: AvatarProps) {
  return (
    <img
      src={src || DEFAULT_AVATAR}
      alt={alt}
      className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
    />
  );
}

export { DEFAULT_AVATAR };
