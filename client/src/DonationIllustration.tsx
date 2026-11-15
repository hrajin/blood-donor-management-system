export function DonationIllustration() {
  return (
    <svg className="donation-illustration" viewBox="0 0 400 290" aria-hidden="true">
      <g className="stand">
        <line x1="320" y1="22" x2="320" y2="272" />
        <line x1="290" y1="30" x2="350" y2="30" />
        <line x1="296" y1="272" x2="344" y2="272" />
      </g>

      <g className="bag">
        <line className="bag-hook" x1="320" y1="30" x2="320" y2="42" />
        <rect className="bag-body" x="296" y="42" width="48" height="74" rx="12" />
        <rect className="bag-label" x="306" y="58" width="28" height="18" rx="3" />
        <rect className="bag-shine" x="302" y="84" width="5" height="22" rx="2.5" />
        <rect className="drip-chamber" x="313" y="118" width="14" height="26" rx="5" />
        <circle className="drop" cx="320" cy="124" r="2.5" />
      </g>

      <g className="chair">
        <path d="M34 240 L60 128 Q63 118 74 121 L84 124 L70 236 Z" />
        <rect x="56" y="214" width="236" height="22" rx="10" />
        <line x1="96" y1="236" x2="86" y2="270" />
        <line x1="256" y1="236" x2="266" y2="270" />
      </g>

      <path className="legs" d="M118 196 L262 192 Q284 192 284 214 L120 218 Z" />
      <path
        className="torso"
        d="M74 148 Q96 132 120 150 L176 196 Q170 218 150 218 L98 218 Q70 196 74 148 Z"
      />
      <path
        className="hair"
        d="M68 124 Q66 98 92 98 Q114 100 110 122 Q100 108 84 112 Q76 116 76 138 Z"
      />
      <circle className="skin" cx="92" cy="122" r="17" />
      <path className="arm" d="M108 160 L150 182 L192 186" />
      <path className="tube" d="M320 144 C 320 232 222 236 172 186" />
      <path className="tube-flow" d="M320 144 C 320 232 222 236 172 186" />
      <rect className="tape" x="164" y="178" width="14" height="10" rx="2" />

      <path
        className="heart"
        d="M200 112 C 200 100 184 98 184 110 C 184 120 200 128 200 132 C 200 128 216 120 216 110 C 216 98 200 100 200 112 Z"
      />
    </svg>
  );
}
