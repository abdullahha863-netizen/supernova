import React, { useId } from 'react';

type DroneProps = {
  className?: string;
  spinSpeed?: number;
};

export const DroneGraphic = ({
  className = "w-64 h-64",
  spinSpeed = 2,
  ...props
}: DroneProps & React.SVGProps<SVGSVGElement>) => {
  const id = useId();

  const rotors = [
    { cx: 120, cy: 95, rx: 45, ry: 6 },
    { cx: 280, cy: 95, rx: 45, ry: 6 },
    { cx: 110, cy: 206, rx: 45, ry: 6 },
    { cx: 290, cy: 206, rx: 45, ry: 6 },
  ];

  return (
    <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <defs>
        <linearGradient id={`bodyMetal-${id}`} x1="200" y1="50" x2="200" y2="250">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="40%" stopColor="#1F2937" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
        <linearGradient id={`armGrad-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4B5563" />
          <stop offset="100%" stopColor="#1F2937" />
        </linearGradient>
        <radialGradient id={`lensGrad-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="80%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#334155" />
        </radialGradient>
        <filter id={`ledGlow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`dropShadow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
          <feOffset dx="0" dy="4" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5"/>
          </feComponentTransfer>
          <feMerge> 
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/> 
          </feMerge>
        </filter>
      </defs>

      <g opacity="0.9">
        <path d="M180 140 L120 100" stroke={`url(#armGrad-${id})`} strokeWidth="12" strokeLinecap="round" />
        <path d="M220 140 L280 100" stroke={`url(#armGrad-${id})`} strokeWidth="12" strokeLinecap="round" />
        <path d="M175 180 L110 210" stroke="#1F2937" strokeWidth="14" strokeLinecap="round" />
        <path d="M225 180 L290 210" stroke="#1F2937" strokeWidth="14" strokeLinecap="round" />

        {rotors.map((r, i) => (
          <g key={i}>
            <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill="white" fillOpacity="0.05">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 ${r.cx} ${r.cy}`}
                to={`360 ${r.cx} ${r.cy}`}
                dur={`${spinSpeed}s`}
                repeatCount="indefinite"
              />
            </ellipse>
          </g>
        ))}

        <ellipse cx="120" cy="100" rx="15" ry="8" fill="#111" />
        <ellipse cx="280" cy="100" rx="15" ry="8" fill="#111" />
        <ellipse cx="110" cy="206" rx="15" ry="8" fill="#111" />
        <ellipse cx="290" cy="206" rx="15" ry="8" fill="#111" />

        {/* Rear Left Lights */}
        <g>
          {['#ff0033', '#009dff'].map((color, i) => (
            <circle key={i} cx="120" cy="95" r="3" fill={color} filter={`url(#ledGlow-${id})`}>
              <animate attributeName="opacity" values="0;1;0" dur="0.55s" repeatCount="indefinite" begin={`${i * 0.275}s`} />
            </circle>
          ))}
        </g>

        {/* Rear Right Lights */}
        <g>
          {['#ff0033', '#009dff'].map((color, i) => (
            <circle key={i} cx="280" cy="95" r="3" fill={color} filter={`url(#ledGlow-${id})`}>
              <animate attributeName="opacity" values="0;1;0" dur="0.55s" repeatCount="indefinite" begin={`${i * 0.275}s`} />
            </circle>
          ))}
        </g>

        {/* Front Left Lights */}
        <g transform="translate(110, 210)">
          {['#ff0033', '#009dff'].map((color, i) => (
            <circle key={i} cx="0" cy="-4" r="3" fill={color} filter={`url(#ledGlow-${id})`}>
              <animate attributeName="opacity" values="0;1;0" dur="0.55s" repeatCount="indefinite" begin={`${i * 0.275}s`} />
            </circle>
          ))}
        </g>

        {/* Front Right Lights */}
        <g transform="translate(290, 210)">
          {['#ff0033', '#009dff'].map((color, i) => (
            <circle key={i} cx="0" cy="-4" r="3" fill={color} filter={`url(#ledGlow-${id})`}>
              <animate attributeName="opacity" values="0;1;0" dur="0.55s" repeatCount="indefinite" begin={`${i * 0.275}s`} />
            </circle>
          ))}
        </g>

      </g>

      <g filter={`url(#dropShadow-${id})`}>
        <path d="M170 120 Q 200 110, 230 120 L 240 160 Q 250 200, 200 230 Q 150 200, 160 160 Z" fill={`url(#bodyMetal-${id})`} stroke="#374151" strokeWidth="1" />
        <path d="M180 125 Q 200 120, 220 125 L 225 140 Q 200 145, 175 140 Z" fill="white" fillOpacity="0.1" />
      </g>

      <g transform="translate(200,185)">
        <circle cx="0" cy="0" r="38" fill="#111827" stroke="#4B5563" strokeWidth="2" />
        <circle cx="0" cy="0" r="32" fill={`url(#lensGrad-${id})`} />
        <circle cx="0" cy="0" r="30" stroke="#000" strokeWidth="4" opacity={0.5} />
        <circle cx="0" cy="0" r="10" fill="#050505" />
        <circle cx="0" cy="0" r="12" stroke="#1F2937" strokeWidth="1" />
        <ellipse cx="-12" cy="-12" rx="10" ry="6" fill="white" fillOpacity="0.15" transform="rotate(-45)" />
        <circle cx="8" cy="8" r="3" fill="white" fillOpacity="0.1" />

        {/* Camera Side Lights */}
        {/* Left (Blue) */}
        <circle cx="-35" cy="0" r="3" fill="#009dff" filter={`url(#ledGlow-${id})`}>
          <animate attributeName="opacity" values="0;1;0" dur="0.55s" repeatCount="indefinite" begin="0.275s" />
        </circle>
        {/* Right (Red) */}
        <circle cx="35" cy="0" r="3" fill="#ff0033" filter={`url(#ledGlow-${id})`}>
          <animate attributeName="opacity" values="0;1;0" dur="0.55s" repeatCount="indefinite" begin="0s" />
        </circle>
      </g>
    </svg>
  );
};

export default React.memo(DroneGraphic);