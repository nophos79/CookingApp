import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = 'w-7 h-7', size }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={size}
    height={size}
    aria-hidden="true"
  >
    {/* House Roof & Chimney - Scaled up & bolder */}
    <path
      d="M12 38L50 12L88 38"
      stroke="currentColor"
      strokeWidth="6.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M72 24V16H80V30"
      stroke="currentColor"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />

    {/* Steam Waves */}
    <path
      d="M43 27C43 23 46 20 46 16"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      opacity="0.85"
    />
    <path
      d="M55 28C55 24 58 21 58 17"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      opacity="0.85"
    />

    {/* Pot Lid & Knob */}
    <path
      d="M24 52C24 45 30 42 50 42C70 42 76 45 76 52H24Z"
      fill="currentColor"
    />
    <circle cx="50" cy="37.5" r="4.5" fill="currentColor" />

    {/* Pot Body */}
    <path
      d="M20 56C20 56 23 86 50 86C77 86 80 56 80 56H20Z"
      fill="currentColor"
    />

    {/* Side Handles */}
    <path
      d="M14 60C14 57 16 56 20 56V63C16 63 14 62 14 60Z"
      fill="currentColor"
      opacity="0.95"
    />
    <path
      d="M86 60C86 57 84 56 80 56V63C84 63 86 62 86 60Z"
      fill="currentColor"
      opacity="0.95"
    />
  </svg>
);
