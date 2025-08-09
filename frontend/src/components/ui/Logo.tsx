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

  // Use podcast artwork across variants for a consistent brand look
  // File lives in /public/brand so it is served from /brand/...
  const src = '/brand/pod logo.png';

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
