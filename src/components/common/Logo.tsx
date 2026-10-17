import React from 'react';

interface LogoProps {
  variant?: 'horizontal' | 'vertical' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const LogoSymbol: React.FC<{ className?: string; isDarkTheme?: boolean }> = ({ className = 'w-10 h-10' }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0`}
    >
      {/* Fountain Pen Nib (Antique Gold #C9A34E) */}
      <g id="pen-nib">
        {/* Outer Nib Flame / Petal Silhouette */}
        <path
          d="M100 22 C125 58 142 85 142 118 C142 136 128 152 100 152 C72 152 58 136 58 118 C58 85 75 58 100 22 Z"
          fill="url(#goldGradient)"
        />
        {/* Inner Nib Cutout Line & Breather Hole */}
        <path
          d="M100 26 L100 96"
          stroke="#073B2E"
          strokeWidth="3.5"
          strokeLinecap="round"
          className="dark:stroke-[#071B16]"
        />
        <circle
          cx="100"
          cy="98"
          r="5"
          fill="#073B2E"
          className="dark:fill-[#071B16]"
        />
      </g>

      {/* Open Book Pages / Wings */}
      <g id="open-book">
        {/* Left Page Wing (Emerald Green in light mode, Gold/Ivory accent) */}
        <path
          d="M96 156 C68 140 38 142 16 154 C24 132 54 126 96 142 Z"
          fill="#073B2E"
          className="dark:fill-[#C9A34E]"
        />
        <path
          d="M96 168 C68 152 38 154 12 168 C22 144 54 138 96 154 Z"
          fill="#0A4D3C"
          className="dark:fill-[#B8923D]"
        />
        
        {/* Right Page Wing */}
        <path
          d="M104 156 C132 140 162 142 184 154 C176 132 146 126 104 142 Z"
          fill="#073B2E"
          className="dark:fill-[#C9A34E]"
        />
        <path
          d="M104 168 C132 152 162 154 188 168 C178 144 146 138 104 154 Z"
          fill="#0A4D3C"
          className="dark:fill-[#B8923D]"
        />
      </g>

      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="goldGradient" x1="58" y1="22" x2="142" y2="152" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E5C778" />
          <stop offset="50%" stopColor="#C9A34E" />
          <stop offset="100%" stopColor="#9E7B2F" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showTagline = true,
}) => {
  // Dimensions mapping
  const symbolSizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10 md:w-11 md:h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const titleSizeMap = {
    sm: 'text-sm font-bold tracking-tight',
    md: 'text-base md:text-lg font-bold tracking-tight',
    lg: 'text-xl md:text-2xl font-bold tracking-wide',
    xl: 'text-2xl md:text-3xl font-extrabold tracking-wider',
  };

  const taglineSizeMap = {
    sm: 'text-[9px] tracking-widest',
    md: 'text-[10px] md:text-[11px] tracking-widest',
    lg: 'text-xs tracking-[0.2em]',
    xl: 'text-sm tracking-[0.25em]',
  };

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <LogoSymbol className={symbolSizeMap[size]} />
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        <LogoSymbol className={symbolSizeMap[size]} />
        <div className="mt-2.5">
          <h1
            className={`font-serif-brand uppercase text-[#073B2E] dark:text-[#F7F6EF] ${titleSizeMap[size]} leading-tight`}
          >
            DARS WITH OSAMA
          </h1>
          {showTagline && (
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="h-[1px] w-6 bg-[#C9A34E]" />
              <span className={`font-sans font-semibold text-[#C9A34E] uppercase ${taglineSizeMap[size]}`}>
                ILMU <span className="text-[#073B2E] dark:text-[#C9A34E] mx-1">•</span> KAJIAN <span className="text-[#073B2E] dark:text-[#C9A34E] mx-1">•</span> KITAB
              </span>
              <span className="h-[1px] w-6 bg-[#C9A34E]" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: Horizontal
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <LogoSymbol className={symbolSizeMap[size]} />
      <div className="flex flex-col justify-center text-left">
        <span
          className={`font-serif-brand font-bold text-[#073B2E] dark:text-[#F7F6EF] ${titleSizeMap[size]} leading-none`}
        >
          DARS WITH OSAMA
        </span>
        {showTagline && (
          <span
            className={`font-sans font-semibold text-[#C9A34E] uppercase ${taglineSizeMap[size]} mt-1 leading-none`}
          >
            ILMU • KAJIAN • KITAB
          </span>
        )}
      </div>
    </div>
  );
};
