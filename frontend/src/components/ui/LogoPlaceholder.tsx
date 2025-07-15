import React from 'react';

interface LogoPlaceholderProps {
  size?: number | string; // tailwind width/height value
}

/**
 * Temporary logo placeholder. Replace SVG or img when official logo is ready.
 */
const LogoPlaceholder: React.FC<LogoPlaceholderProps> = ({ size = '10' }) => {
  return (
    <div
      className={`w-${size} h-${size} bg-signal-green rounded-lg flex items-center justify-center select-none`}
      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
    >
      <span className="text-white font-bold">SC</span>
    </div>
  );
};

export default LogoPlaceholder;
