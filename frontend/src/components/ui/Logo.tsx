import React from 'react';
import { useColorScheme } from '../../contexts/ColorSchemeContext';

interface LogoProps {
  variant?: 'mark' | 'horizontal';
  size?: number; // width in px for mark variant
  className?: string;
}

/**
 * Renders the official SignalCaller logo from /public/brand.
 * Automatically switches between light and dark variants based on color scheme.
 * Variant:
 *  - mark: square icon (default)
 *  - horizontal: wider logotype
 */
const Logo: React.FC<LogoProps> = ({
  variant = 'mark',
  size = 40,
  className = '',
}) => {
  const { colorScheme } = useColorScheme();

  const src =
    colorScheme === 'dark'
      ? variant === 'horizontal'
        ? '/brand/logo_embedded.svg'
        : '/brand/logo_embedded.svg'
      : variant === 'horizontal'
        ? '/brand/logo_white_embedded.svg'
        : '/brand/logo_white_embedded.svg';

  return (
    <img
      src={src}
      alt="TheSignalCallers logo"
      className={`${variant === 'mark' ? 'logo-mark' : ''} ${className}`}
      style={variant === 'mark' ? { width: size } : undefined}
    />
  );
};

export default Logo;
