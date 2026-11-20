import { useId } from 'react';

/** Ấn triện: ô vuông màu hổ phách, viền vàng, chữ "譜" (phả) */
export default function Seal({ size = 40 }) {
  // id gradient riêng cho từng ấn triện: nếu dùng chung một id mà bản đầu tiên bị ẩn (display:none),
  // trình duyệt không vẽ được gradient cho các bản còn lại
  const gid = `seal-g-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0 drop-shadow-sm">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d38b3c" />
          <stop offset="1" stopColor="#a5621f" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${gid})`} />
      <rect x="8" y="8" width="48" height="48" rx="10" fill="none" stroke="#fdf3de" strokeOpacity="0.75" strokeWidth="1.8" />
      <text x="32" y="44" textAnchor="middle" fontSize="31" fontFamily="'Noto Serif', serif" fill="#fffaf0">
        譜
      </text>
    </svg>
  );
}
