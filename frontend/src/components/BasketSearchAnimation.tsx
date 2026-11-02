/** A magnifying glass rummaging through a basket. Decorative: the text beside it says what happened. */
export function BasketSearchAnimation({ className = 'w-56' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} aria-hidden="true">
      <circle cx="120" cy="92" r="84" fill="var(--color-brand-soft)" />
      <ellipse className="basket-shadow" cx="120" cy="164" rx="66" ry="6" fill="#e9c9d8" />

      <text className="basket-question" x="44" y="62" fontSize="26" fontWeight="700" fill="var(--color-brand)">
        ?
      </text>
      <text className="basket-question basket-question-late" x="186" y="52" fontSize="20" fontWeight="700" fill="var(--color-deal)">
        ?
      </text>

      <g className="basket-wiggle">
        <path d="M78 92C78 30 162 30 162 92" fill="none" stroke="#0b6b42" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="120" cy="94" rx="60" ry="9" fill="#084f31" />

        {/* Drawn between the basket's back and front, so the glass dips inside it. */}
        <g className="basket-lens">
          <line x1="135" y1="77" x2="153" y2="95" stroke="#10204f" strokeWidth="8" strokeLinecap="round" />
          <circle cx="120" cy="62" r="21" fill="#ffffff" fillOpacity="0.75" stroke="#10204f" strokeWidth="6" />
          <path d="M108 58a13 13 0 0 1 9-9" fill="none" stroke="var(--color-brand)" strokeWidth="3" strokeLinecap="round" />
        </g>

        <path d="M60 98 74 152q1 5 6 5h80q5 0 6-5l14-54Z" fill="#0e8a55" />
        <g stroke="#0b6b42" strokeWidth="5" strokeLinecap="round">
          <line x1="90" y1="112" x2="93" y2="144" />
          <line x1="120" y1="112" x2="120" y2="144" />
          <line x1="150" y1="112" x2="147" y2="144" />
        </g>
        <rect x="52" y="90" width="136" height="12" rx="6" fill="#0b6b42" />
      </g>
    </svg>
  );
}
