'use client';

import * as React from "react"
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export default function Logo2b({ className }: LogoProps) {
  return (
    <div className={cn('relative', className)}> {/* Alterado: removido w-full h-full */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 205 55"
        preserveAspectRatio="xMidYMid meet"
        aria-labelledby="check2bLogoTitle"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="check2bLogoTitle">Check2B Logo</title>
        <style>
          {`
            .check2b-font { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; }
          `}
        </style>
        <text x="5" y="40" className="check2b-font" fontSize="30" fontWeight="bold">
          <tspan fill="#333D47">Check</tspan>
          <tspan fill="hsl(var(--primary))">2B</tspan>
        </text>

        {/* Ícone do check com a borda arredondada */}
        <g transform="translate(5, 0)">
          <path
            d="M143 7 H173 A5 5 0 0 1 178 12 V43 A5 5 0 0 1 173 48 H143 A5 5 0 0 1 138 43 V12 A5 5 0 0 1 143 7 Z"
            fill="hsl(var(--primary))"
          />
          <path
            d="M148 27 L157 36 L169 21"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}
