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
