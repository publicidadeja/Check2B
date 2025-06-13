
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo2b({ className }: LogoProps) {
  return (
    <div className={cn('relative w-full h-full', className)}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 145 55" // Adjusted viewBox for better fit
        preserveAspectRatio="xMidYMid meet"
        aria-labelledby="check2bLogoTitle"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="check2bLogoTitle">Check2B Logo</title>
        <style>
          {`
            .check2b-font { 
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; 
            }
          `}
        </style>
        {/* Text part: "Check" and "2" */}
        <text y="40" className="check2b-font" fontSize="30" fontWeight="bold">
          <tspan x="5" fill="#333D47">Check</tspan>
          {/* The "2" is part of the text flow, using dx for minor adjustment if needed */}
          <tspan dx="1" fill="hsl(var(--primary))">2</tspan>
        </text>

        {/* Icon part: The "B"-like shape with checkmark */}
        {/* Positioned after "Check2". Assuming "Check" is ~85px, "2" is ~17px. Total ~102px. Start icon at x=107 */}
        {/* Icon visual top aligns with text top (around y=10 for fontSize=30, y=40 baseline) */}
        {/* Icon height 30px to match text height */}
        <g transform="translate(107, 10)">
          {/* Rounded rectangle for the "B" icon shape (30x30, radius 5) */}
          <path
            d="M5,0 H25 A5,5 0 0 1 30,5 V25 A5,5 0 0 1 25,30 H5 A5,5 0 0 1 0,25 V5 A5,5 0 0 1 5,0 Z"
            fill="hsl(var(--primary))"
          />
          {/* Checkmark inside the "B" icon (scaled and centered) */}
          {/* Original check: M10,20 L19,29 L31,14 in a ~40x40 box. Scaled for 30x30 box (factor ~0.75) */}
          <path
            d="M7.5 15 L13.5 21 L22.5 10" // Adjusted for better centering & appearance in a 30x30 box
            stroke="#FFFFFF"
            strokeWidth="3" // Slightly thicker checkmark for better visibility
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}
