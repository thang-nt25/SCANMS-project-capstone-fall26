import type { ScoreBreakdown } from '../../services/ai-recommendation.service';

/** Scores are ranking signals (0–100), never an estimated probability of a sale. */
export function KolMatchRadar({ scores }: { scores: ScoreBreakdown }) {
  const values = [scores.categoryScore, scores.conversionRateScore, scores.tierAndSocialScore, scores.priceFitScore]
    .map(value => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0);
  const axes = [[120, 35], [205, 120], [120, 205], [35, 120]];
  const points = values.map((v, i) => `${120 + (axes[i][0] - 120) * v / 100},${120 + (axes[i][1] - 120) * v / 100}`).join(' ');
  return <svg viewBox="0 0 240 240" className="mx-auto w-full max-w-[240px]" role="img" aria-label={`Điểm 4 trục: ngành hàng ${values[0]}, chuyển đổi ${values[1]}, cấp bậc và xã hội ${values[2]}, giá ${values[3]}`}>
    {[.25, .5, .75, 1].map(scale => <polygon key={scale} points={axes.map(([x, y]) => `${120 + (x - 120) * scale},${120 + (y - 120) * scale}`).join(' ')} fill="none" stroke="#EAE4D7" />)}
    {axes.map(([x, y]) => <line key={`${x}-${y}`} x1="120" y1="120" x2={x} y2={y} stroke="#EAE4D7" />)}
    <polygon points={points} fill="#C59B58" fillOpacity=".2" stroke="#B88E4F" strokeWidth="2" />
    <g fill="#7D715E" fontSize="10" textAnchor="middle"><text x="120" y="20">Ngành hàng</text><text x="218" y="119">CR</text><text x="120" y="226">Cấp bậc / Xã hội</text><text x="20" y="119">Giá</text></g>
  </svg>;
}
