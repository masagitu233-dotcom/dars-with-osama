import React from 'react';

interface LogoSymbolProps {
  className?: string;
}

/**
 * Pure Vector SVG Symbol of the Dars with Osama Logo:
 * - Modern Neo-Brutalist framing with Forest Green (#06251D) & Gold (#D9AC45)
 * - Open Book (Kitab), Crescent Moon (Hilal), and 8-Pointed Star (Rub el Hizb)
 */
export const LogoSymbol: React.FC<LogoSymbolProps> = ({ className = 'w-10 h-10' }) => {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Dars with Osama"
    >
      <defs>
        <linearGradient id="darsGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1A5345" />
          <stop offset="100%" stopColor="#123D32" />
        </linearGradient>
        <linearGradient id="darsGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E5C26B" />
          <stop offset="50%" stopColor="#D6AD52" />
          <stop offset="100%" stopColor="#B38936" />
        </linearGradient>
      </defs>

      {/* Outer Neo-Brutalist Medallion Frame */}
      <rect
        x="8"
        y="8"
        width="104"
        height="104"
        rx="18"
        fill="url(#darsGreenGrad)"
        stroke="#D6AD52"
        strokeWidth="4"
      />

      {/* Inner Frame Line */}
      <rect
        x="15"
        y="15"
        width="90"
        height="90"
        rx="12"
        stroke="#D6AD52"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.75"
      />

      {/* Top Islamic 8-Pointed Star (Rub el Hizb) */}
      <g transform="translate(60, 28)">
        <rect
          x="-6"
          y="-6"
          width="12"
          height="12"
          fill="url(#darsGoldGrad)"
        />
        <rect
          x="-6"
          y="-6"
          width="12"
          height="12"
          transform="rotate(45)"
          fill="url(#darsGoldGrad)"
        />
        <circle cx="0" cy="0" r="2.5" fill="#123D32" />
      </g>

      {/* Crescent Moon (Hilal) Embracing the Book */}
      <path
        d="M36 44C36 60 46.7452 72 60 72C73.2548 72 84 60 84 44C81 53 71.5 60 60 60C48.5 60 39 53 36 44Z"
        fill="url(#darsGoldGrad)"
      />

      {/* Open Kitab / Book Pages */}
      <path
        d="M60 54C50 54 39 50 30 45V80C39 85 50 89 60 89C70 89 81 85 90 80V45C81 50 70 54 60 54Z"
        fill="#FAF7F0"
        stroke="url(#darsGoldGrad)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Center Book Spine */}
      <line
        x1="60"
        y1="54"
        x2="60"
        y2="89"
        stroke="#123D32"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Left & Right Page Calligraphy Lines */}
      <path
        d="M37 57C43 60 50 62 55 62M37 66C43 69 50 71 55 71M37 75C43 78 50 80 55 80"
        stroke="#123D32"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M83 57C77 60 70 62 65 62M83 66C77 69 70 71 65 71M83 75C77 78 70 80 65 80"
        stroke="#123D32"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Book Base / Rehal Support */}
      <path
        d="M26 86L60 96L94 86"
        stroke="url(#darsGoldGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface LogoFullProps {
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  variant?: 'light' | 'dark' | string;
}

export const LogoFull: React.FC<LogoFullProps> = ({
  onClick,
  size = 'md',
  showTagline = true,
  variant
}) => {
  const iconSizes = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-14 h-14'
  };

  const titleSizes = {
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl sm:text-3xl'
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer group' : ''}`}
    >
      <div className="relative flex items-center justify-center rounded-md border-2 border-[#292D2B] dark:border-[#34465D] shadow-[2px_2px_0px_#292D2B] dark:shadow-[2px_2px_0px_#D6AD52] bg-[#123D32] dark:bg-[#16263D] transition-transform duration-150 group-hover:-translate-y-0.5">
        <LogoSymbol className={`${iconSizes[size]}`} />
      </div>

      <div className="flex flex-col text-left shrink-0 whitespace-nowrap">
        <span
          className={`font-serif-brand font-extrabold tracking-tight leading-none text-[#123D32] dark:text-[#F1F4F8] transition-colors whitespace-nowrap ${titleSizes[size]}`}
        >
          Dars <span className="font-normal italic text-[#D6AD52]">with</span> Osama
        </span>
        {showTagline && (
          <span className="text-[10px] font-sans font-extrabold tracking-[0.2em] uppercase text-[#626A66] dark:text-[#D6AD52] mt-1 whitespace-nowrap">
            ILMU • KAJIAN • KITAB
          </span>
        )}
      </div>
    </div>
  );
};

export const Logo = LogoFull;
export default LogoFull;
