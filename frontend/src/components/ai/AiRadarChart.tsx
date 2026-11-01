import type { ScoreBreakdown } from '../../services/ai-recommendation.service';

interface SingleRadarProps {
  scores: ScoreBreakdown;
  size?: number;
  color?: string;
  fillColor?: string;
  showLabels?: boolean;
  className?: string;
}

interface MultiRadarDataset {
  name: string;
  scores: ScoreBreakdown;
  color: string;
  fillColor?: string;
}

interface MultiRadarProps {
  datasets: MultiRadarDataset[];
  size?: number;
  showLabels?: boolean;
  className?: string;
}

/**
 * Pure SVG 4-Axis Radar Chart for SCANMS AI Matchmaker
 * 4 Axes:
 * 1. Ngành hàng (Category Match - 35%) - Top (12:00)
 * 2. Chuyển đổi (Conversion CR% - 25%) - Right (3:00)
 * 3. Hạng & MXH (Tier & Social - 20%) - Bottom (6:00)
 * 4. Khoảng giá (Price Fit - 20%) - Left (9:00)
 */
export function AiRadarChart({
  scores,
  size = 180,
  color = '#B88E4F',
  fillColor = 'rgba(197, 155, 88, 0.22)',
  showLabels = true,
  className = '',
}: SingleRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  // Margin for axis labels
  const r = size * 0.34;

  const clamp = (val?: number) => Math.max(5, Math.min(100, val || 0));

  const topVal = clamp(scores.categoryScore);
  const rightVal = clamp(scores.conversionRateScore);
  const bottomVal = clamp(scores.tierAndSocialScore);
  const leftVal = clamp(scores.priceFitScore);

  const pTop = { x: cx, y: cy - (r * topVal) / 100 };
  const pRight = { x: cx + (r * rightVal) / 100, y: cy };
  const pBottom = { x: cx, y: cy + (r * bottomVal) / 100 };
  const pLeft = { x: cx - (r * leftVal) / 100, y: cy };

  const polygonPoints = `${pTop.x},${pTop.y} ${pRight.x},${pRight.y} ${pBottom.x},${pBottom.y} ${pLeft.x},${pLeft.y}`;

  // Grid levels at 25%, 50%, 75%, 100%
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background Web Polygons */}
        {gridLevels.map((lvl) => {
          const gr = r * lvl;
          const points = `${cx},${cy - gr} ${cx + gr},${cy} ${cx},${cy + gr} ${cx - gr},${cy}`;
          return (
            <polygon
              key={lvl}
              points={points}
              fill={lvl === 1.0 ? '#FAF8F5' : 'none'}
              stroke="#EAE4D7"
              strokeWidth={lvl === 1.0 ? 1.5 : 1}
              strokeDasharray={lvl < 1.0 ? '2,2' : undefined}
            />
          );
        })}

        {/* Cross Axes Lines */}
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#E2DACB" strokeWidth={1} strokeDasharray="2,2" />
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#E2DACB" strokeWidth={1} strokeDasharray="2,2" />

        {/* Data Polygon */}
        <polygon
          points={polygonPoints}
          fill={fillColor}
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          className="transition-all duration-300 ease-out"
        />

        {/* Vertices Dots */}
        {[pTop, pRight, pBottom, pLeft].map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth={1.5}
            className="transition-all duration-300"
          />
        ))}

        {/* Axis Labels */}
        {showLabels && (
          <g className="text-[10px] font-semibold fill-[#7D715E]">
            {/* Top: Ngành hàng */}
            <text x={cx} y={cy - r - 6} textAnchor="middle" className="text-[10px] font-bold fill-[#1A1612]">
              Ngành ({scores.categoryScore || 0})
            </text>
            {/* Right: Chuyển đổi */}
            <text x={cx + r + 6} y={cy + 3} textAnchor="start" className="text-[10px] font-bold fill-[#1A1612]">
              CR% ({scores.conversionRateScore || 0})
            </text>
            {/* Bottom: Hạng & MXH */}
            <text x={cx} y={cy + r + 13} textAnchor="middle" className="text-[10px] font-bold fill-[#1A1612]">
              Hạng ({scores.tierAndSocialScore || 0})
            </text>
            {/* Left: Phân khúc giá */}
            <text x={cx - r - 6} y={cy + 3} textAnchor="end" className="text-[10px] font-bold fill-[#1A1612]">
              Giá ({scores.priceFitScore || 0})
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * Multi-Dataset Overlaid Radar Chart for Direct 1-on-1 / 1-on-2 Comparison
 */
export function MultiAiRadarChart({
  datasets,
  size = 280,
  showLabels = true,
  className = '',
}: MultiRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;

  const clamp = (val?: number) => Math.max(5, Math.min(100, val || 0));
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background Concentric Diamonds */}
        {gridLevels.map((lvl) => {
          const gr = r * lvl;
          const points = `${cx},${cy - gr} ${cx + gr},${cy} ${cx},${cy + gr} ${cx - gr},${cy}`;
          return (
            <polygon
              key={lvl}
              points={points}
              fill={lvl === 1.0 ? '#FAF8F5' : 'none'}
              stroke="#EAE4D7"
              strokeWidth={lvl === 1.0 ? 1.5 : 1}
              strokeDasharray={lvl < 1.0 ? '3,3' : undefined}
            />
          );
        })}

        {/* Center Cross Hair */}
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#E2DACB" strokeWidth={1} strokeDasharray="2,2" />
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#E2DACB" strokeWidth={1} strokeDasharray="2,2" />

        {/* Multi Polygons Overlaid */}
        {datasets.map((item, idx) => {
          const topVal = clamp(item.scores.categoryScore);
          const rightVal = clamp(item.scores.conversionRateScore);
          const bottomVal = clamp(item.scores.tierAndSocialScore);
          const leftVal = clamp(item.scores.priceFitScore);

          const pTop = { x: cx, y: cy - (r * topVal) / 100 };
          const pRight = { x: cx + (r * rightVal) / 100, y: cy };
          const pBottom = { x: cx, y: cy + (r * bottomVal) / 100 };
          const pLeft = { x: cx - (r * leftVal) / 100, y: cy };
          const points = `${pTop.x},${pTop.y} ${pRight.x},${pRight.y} ${pBottom.x},${pBottom.y} ${pLeft.x},${pLeft.y}`;

          return (
            <g key={idx}>
              <polygon
                points={points}
                fill={item.fillColor || `${item.color}33`}
                stroke={item.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
              {[pTop, pRight, pBottom, pLeft].map((p, pIdx) => (
                <circle
                  key={pIdx}
                  cx={p.x}
                  cy={p.y}
                  r={3.5}
                  fill={item.color}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          );
        })}

        {/* Outer Axis Labels with Weights */}
        {showLabels && (
          <g className="text-xs font-semibold fill-[#1A1612]">
            <text x={cx} y={cy - r - 8} textAnchor="middle" className="text-xs font-bold fill-[#1A1612]">
              1. Ngành hàng (35%)
            </text>
            <text x={cx + r + 8} y={cy + 4} textAnchor="start" className="text-xs font-bold fill-[#1A1612]">
              2. CR% (25%)
            </text>
            <text x={cx} y={cy + r + 18} textAnchor="middle" className="text-xs font-bold fill-[#1A1612]">
              4. Cấp bậc & MXH (20%)
            </text>
            <text x={cx - r - 8} y={cy + 4} textAnchor="end" className="text-xs font-bold fill-[#1A1612]">
              3. Giá bán (20%)
            </text>
          </g>
        )}
      </svg>

      {/* Dataset Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        {datasets.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-xs font-bold text-[#1A1612]">
            <span className="w-3 h-3 rounded-full border border-white shadow-xs" style={{ backgroundColor: item.color }} />
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
