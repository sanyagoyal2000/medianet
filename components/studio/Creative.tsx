// Generic gift artwork built in SVG (no external images, no real logos).
export function GiftArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 110" className={className} role="img" aria-label="Wrapped gift boxes">
      <defs>
        <linearGradient id="bgw" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#F7F1E8" /><stop offset="1" stopColor="#EADFCF" /></linearGradient>
      </defs>
      <rect width="160" height="110" rx="6" fill="url(#bgw)" />
      <path d="M8 18 l10 -8 l6 9 l9 -6" stroke="#2E6B3F" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="22" r="3" fill="#C8102E" /><circle cx="27" cy="15" r="2.5" fill="#C8102E" />
      <rect x="44" y="40" width="58" height="52" rx="3" fill="#F2EBDD" stroke="#D9CDB6" />
      <rect x="69" y="40" width="9" height="52" fill="#C8102E" />
      <rect x="44" y="58" width="58" height="9" fill="#C8102E" />
      <path d="M73 40 c-14 -16 -26 -6 -14 0 z M74 40 c14 -16 26 -6 14 0 z" fill="#D7263D" />
      <rect x="104" y="62" width="40" height="32" rx="3" fill="#F2EBDD" stroke="#D9CDB6" />
      <rect x="120" y="62" width="7" height="32" fill="#C8102E" />
      <rect x="104" y="74" width="40" height="7" fill="#C8102E" />
      <path d="M123 62 c-9 -10 -17 -4 -9 0 z M124 62 c9 -10 17 -4 9 0 z" fill="#D7263D" />
      <path d="M140 20 l6 6 M146 20 l-6 6" stroke="#2E6B3F" strokeWidth="2" />
    </svg>
  );
}

export function MugArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 145" className={className} role="img" aria-label="Insulated travel mug next to a wrapped gift">
      <rect width="200" height="145" rx="6" fill="#EFE7DC" />
      <rect x="0" y="105" width="200" height="40" fill="#D8C7B0" />
      <rect x="14" y="78" width="46" height="40" rx="2" fill="#E9DCC6" stroke="#CDBA9C" />
      <rect x="33" y="78" width="8" height="40" fill="#B51F2E" />
      <path d="M37 78 c-10 -10 -18 -2 -8 0 z M38 78 c10 -10 18 -2 8 0 z" fill="#C8273A" />
      <rect x="78" y="34" width="62" height="88" rx="8" fill="#2F5D4A" />
      <rect x="74" y="26" width="70" height="14" rx="4" fill="#9AA5A0" />
      <rect x="74" y="26" width="70" height="5" rx="2" fill="#C9D1CD" />
      <path d="M140 52 h14 a10 10 0 0 1 10 10 v26 a10 10 0 0 1 -10 10 h-14" stroke="#2F5D4A" strokeWidth="9" fill="none" />
      <rect x="86" y="44" width="6" height="68" rx="3" fill="#3E7560" />
      <path d="M168 18 l7 -6 l5 7 l7 -4" stroke="#3B6B45" strokeWidth="3" fill="none" />
    </svg>
  );
}

export function KohlsWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded border border-[#E4E7EC] bg-white px-2 py-2 ${className}`} aria-label="Kohl's">
      <span className="text-[13px] font-black tracking-[0.12em] text-[#7A0C2E]">KOHL&apos;S</span>
    </span>
  );
}
