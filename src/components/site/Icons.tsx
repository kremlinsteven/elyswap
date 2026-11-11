/* Small line icons, drawn for this site on a 16 grid. */
type P = { size?: number };
const S = ({ size = 16, children }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
export const ArrowUpRight = (p: P) => <S {...p}><path d="M5 11l6-6M6 5h5v5" /></S>;
export const CheckIcon = (p: P) => <S {...p}><path d="M3 8.5l3.2 3L13 4.5" /></S>;
export const CloseIcon = (p: P) => <S {...p}><path d="M4 4l8 8M12 4l-8 8" /></S>;
export const CopyIcon = (p: P) => <S {...p}><rect x="5.5" y="5.5" width="8" height="8" rx="1" /><path d="M10.5 3H3.5a1 1 0 0 0-1 1v7" /></S>;
export const LogOutIcon = (p: P) => <S {...p}><path d="M6.5 13.5H3.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3M10.5 11l3-3-3-3M13.5 8H6" /></S>;
export const PlayIcon = (p: P) => <S {...p}><path d="M5 3.5l8 4.5-8 4.5z" /></S>;
export const RefreshIcon = (p: P) => <S {...p}><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" /></S>;
export const WalletIcon = (p: P) => <S {...p}><rect x="2" y="4" width="12" height="9.5" rx="1" /><path d="M2 6.5h12M10.5 10h1" /></S>;
export const MenuIcon = (p: P) => <S {...p}><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /></S>;
export const XIcon = (p: P) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.2 2.3h3.3l-7.2 8.2 8.5 11.2h-6.7l-5.2-6.8-6 6.8H1.6l7.7-8.8L1.2 2.3H8l4.7 6.2zm-1.2 17.4h1.8L7.1 4.2H5.1z" />
  </svg>
);
export const GithubIcon = (p: P) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.8 18.3 5.1 18.3 5.1c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
  </svg>
);
export const ArrowRight = (p: P) => <S {...p}><path d="M2.5 8h11M9 3.5L13.5 8 9 12.5" /></S>;
export const ArrowDownRight = (p: P) => <S {...p}><path d="M4 4l8 8M12 6v6H6" /></S>;
export const ClockIcon = (p: P) => <S {...p}><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></S>;
export const HourglassIcon = (p: P) => <S {...p}><path d="M4 2h8M4 14h8M5 2c0 3 6 3 6 6s-6 3-6 6M11 2c0 3-6 3-6 6s6 3 6 6" /></S>;
export const StackIcon = (p: P) => <S {...p}><path d="M8 2l6 3-6 3-6-3zM2 8l6 3 6-3M2 11l6 3 6-3" /></S>;
export const ClaimIcon = (p: P) => <S {...p}><path d="M8 2v8M4.5 6.5L8 10l3.5-3.5M3 13h10" /></S>;
export const RouteIcon = (p: P) => <S {...p}><circle cx="3.5" cy="11.5" r="1.8" /><circle cx="12.5" cy="11.5" r="1.8" /><path d="M5 10C6 4 10 4 11 10" /></S>;
export const PinIcon = (p: P) => <S {...p}><path d="M8 14s-4.5-4.2-4.5-7.5a4.5 4.5 0 0 1 9 0C12.5 9.8 8 14 8 14z" /><circle cx="8" cy="6.5" r="1.5" /></S>;
export const BookIcon = (p: P) => <S {...p}><path d="M3 2.5h7.5a2 2 0 0 1 2 2V14H5a2 2 0 0 1-2-2zM3 12a2 2 0 0 1 2-2h7.5" /></S>;
export const PulseIcon = (p: P) => <S {...p}><path d="M1.5 8h3l1.5-4 3 8 1.5-4h4" /></S>;
export const ShieldIcon = (p: P) => <S {...p}><path d="M8 1.8l5 2v4c0 3.2-2.2 5.3-5 6.4-2.8-1.1-5-3.2-5-6.4v-4z" /></S>;
export const CoinsIcon = (p: P) => <S {...p}><ellipse cx="6" cy="5" rx="4" ry="2" /><path d="M2 5v3c0 1.1 1.8 2 4 2s4-.9 4-2V5" /><path d="M7 11.8c.6.1 1.3.2 2 .2 2.2 0 4-.9 4-2V7" /></S>;
export const AlertIcon = (p: P) => <S {...p}><path d="M8 2l6.5 11.5h-13zM8 6.5v3.2M8 11.6v.1" /></S>;
export const HandIcon = (p: P) => <S {...p}><path d="M5.5 8V3.5a1 1 0 0 1 2 0V7M7.5 7V2.5a1 1 0 0 1 2 0V7M9.5 7V3.5a1 1 0 0 1 2 0V9c0 3-1.8 5-4.5 5S3 12 3 10V7.5a1 1 0 0 1 2 0V9" /></S>;
