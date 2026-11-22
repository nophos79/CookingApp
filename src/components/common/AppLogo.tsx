import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={size}
    height={size}
    aria-hidden="true"
  >
    {/* House Roof & Chimney */}
    <path
      d="M22 40L50 19L78 40"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M68 28V22H74V32"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />

    {/* Steam Waves */}
    <path
      d="M44 32C44 29.5 46 27.5 46 25"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.85"
    />
    <path
      d="M54 33C54 30.5 56 28.5 56 26"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.85"
    />

    {/* Pot Lid */}
    <path
      d="M31 51C31 46.5 35 44 50 44C65 44 69 46.5 69 51H31Z"
      fill="currentColor"
    />
    <circle cx="50" cy="40.5" r="4" fill="currentColor" />

    {/* Pot Body */}
    <path
      d="M28 54C28 54 30 76 50 76C70 76 72 54 72 54H28Z"
      fill="currentColor"
    />

    {/* Side Handles */}
    <path
      d="M23 57C23 55 25 54 28 54V59C25 59 23 58 23 57Z"
      fill="currentColor"
      opacity="0.95"
    />
    <path
      d="M77 57C77 55 75 54 72 54V59C75 59 77 58 77 57Z"
      fill="currentColor"
      opacity="0.95"
    />
  </svg>
);
