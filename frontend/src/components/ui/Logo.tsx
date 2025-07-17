import React from 'react';

interface LogoProps {
  variant?: 'mark' | 'horizontal';
  size?: number; // width in px for mark variant
  className?: string;
}

/**
 * Renders the official SignalCaller logo from /public/brand.
 * Variant:
 *  - mark: square icon (default)
 *  - horizontal: wider logotype
 */
const Logo: React.FC<LogoProps> = ({
  variant = 'mark',
  size = 40,
  className = '',
}) => {
  const src =
    variant === 'horizontal'
      ? '/brand/logo_embedded.svg'
      : '/brand/logo_embedded.svg';
  // Using same file; mark variant sets size.
  return (
    <img
      src={src}
      alt="TheSignalCaller logo"
      className={`${variant === 'mark' ? 'logo-mark' : ''} ${className}`}
      style={variant === 'mark' ? { width: size } : undefined}
    />
  );
};

export default Logo;
