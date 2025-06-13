
'use client';
import * as React from "react";
import { cn } from '@/lib/utils';

interface Logo2bProps extends React.SVGProps<SVGSVGElement> {
  // className is implicitly part of SVGProps for <svg>
}

// Usando exportação nomeada
export function Logo2b(props: Logo2bProps) {
  // ViewBox estimado: minX ~70, maxX ~1900, minY ~850, maxY ~1250.
  // Width: 1900 - 70 = 1830
  // Height: 1250 - 850 = 400
  // Para manter uma proporção mais próxima do logo visualizado na imagem de referência (que parece menos largo que 1830:400),
  // ajustaremos o viewBox para focar nos elementos principais, assumindo uma origem mais próxima de (0,0) para o conteúdo relevante.
  // O SVG original parece ter muito espaço vazio ou coordenadas em uma escala grande.
  // Vamos tentar um viewBox que capture a essência do logo na imagem fornecida: "Check2" e o ícone "B".
  // Baseado na imagem, a proporção é algo em torno de 4:1 ou 5:1 (largura:altura).
  // Se o texto "Check" começa perto de x=70 e o ícone termina perto de x=1800, e a altura é ~360-400.
  // Tentativa de viewBox: "0 0 1800 450" (relativo às coordenadas do SVG, mas pode precisar de ajuste de translação)
  // As coordenadas do seu SVG são muito grandes. Vou tentar normalizá-las ou usar um viewBox amplo.
  // Por agora, vou usar um viewBox que engloba as coordenadas fornecidas.
  // E vamos aplicar cores conforme a imagem de referência.

  // Coordenadas extraídas do SVG original:
  // Texto "Check2" (Path 4): M299.59 1194.95 ...
  // Ícone B (Path 5): M1259.39 1207.94 ...
  // Checkmark (Path 1): M1734.52 1032 ...

  // Para simplificar e focar na renderização correta baseada na imagem:
  // Vou recriar um SVG mais limpo baseado na sua imagem de referência,
  // pois o SVG fornecido tem um path único para "Check2" o que impede coloração diferente.
  // Isso também resolve o problema do viewBox complicado.

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 230 60" // ViewBox ajustado para proporção mais comum de logo
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      {...props} // Permite que className seja passado para o SVG
    >
      <title id="check2bLogoTitle">Check2B Logo</title>
      <style>
        {`.check2b-font { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; }`}
      </style>
      {/* Texto "Check" */}
      <text
        x="5"
        y="42"
        className="check2b-font"
        fontSize="38"
        fontWeight="bold"
        fill="#333D47" // Cor escura para "Check"
      >
        Check
      </text>

      {/* Número "2" */}
      <text
        x="118" // Posição ajustada
        y="42"
        className="check2b-font"
        fontSize="38"
        fontWeight="bold"
        fill="hsl(var(--primary))" // Cor primária para "2"
      >
        2
      </text>

      {/* Ícone "B" com checkmark */}
      <g transform="translate(150, 4)"> {/* Posição ajustada */}
        <rect
          x="0"
          y="0"
          width="55"
          height="50"
          rx="10"
          ry="10"
          fill="hsl(var(--primary))" // Cor primária para o fundo do "B"
        />
        <path
          d="M12 25 L22 35 L43 15" // Checkmark
          stroke="hsl(var(--primary-foreground))" // Cor do texto primário (geralmente branco) para o checkmark
          strokeWidth="5.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
