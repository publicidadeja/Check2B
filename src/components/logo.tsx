'use client';

import * as React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function Logo({ className, ...props }: LogoProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Check2B Logo"
      {...props}
    >
      {/* Background shape (clipboard-like) */}
      <path
        d="M15.5 2H8.5C7.11929 2 6 3.11929 6 4.5V19.5C6 20.8807 7.11929 22 8.5 22H15.5C16.8807 22 18 20.8807 18 19.5V4.5C18 3.11929 16.8807 2 15.5 2Z"
        fill="hsl(var(--primary))" // Use primary color for background
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="1"
      />
      {/* Checkmark */}
      <path
        d="M9.5 11.5L12 14L15 10"
        stroke="hsl(var(--primary-foreground))" // Use foreground for check
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
       {/* "2B" text - slightly simplified */}
       <text
         x="10" y="19.5"
         fontFamily="Arial, sans-serif"
         fontSize="5"
         fontWeight="bold"
         fill="hsl(var(--primary-foreground))"
         textAnchor="middle"
       >
         2B
       </text>
    </svg>
  );
}
