// Line icons of the owner panel (same strokes as the approved prototype).
type P = { size?: number }
const svg = (size: number, sw: number, children: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden="true">
    {children}
  </svg>
)

export const HomeIcon = ({ size = 22 }: P) => svg(size, 2, <><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /></>)
export const BannerIcon = ({ size = 22 }: P) =>
  svg(size, 2, <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 16 5-5 4 4 3-3 6 6" /></>)
export const PadIcon = ({ size = 22 }: P) =>
  svg(size, 2, <><path d="M6 9h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5.2 2L15 14H9l-1.8 2A3 3 0 0 1 2 14v-1a4 4 0 0 1 4-4Z" /><path d="M8 11v3M6.5 12.5h3" /></>)
export const BoxIcon = ({ size = 22 }: P) => svg(size, 2, <><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>)
export const ExternalIcon = ({ size = 17 }: P) =>
  svg(size, 2.1, <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>)
export const ChatIcon = ({ size = 18 }: P) => svg(size, 2.1, <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />)
export const ArrowRight = ({ size = 18 }: P) => svg(size, 2.4, <path d="M5 12h14M13 6l6 6-6 6" />)
export const UpIcon = ({ size = 18 }: P) => svg(size, 2.2, <path d="m6 15 6-6 6 6" />)
export const DownIcon = ({ size = 18 }: P) => svg(size, 2.2, <path d="m6 9 6 6 6-6" />)
export const EyeIcon = ({ size = 18 }: P) =>
  svg(size, 2, <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>)
export const EyeOffIcon = ({ size = 18 }: P) =>
  svg(size, 2, <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><path d="M3 3l18 18" /></>)
export const TrashIcon = ({ size = 18 }: P) => svg(size, 2, <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />)
export const PlusIcon = ({ size = 18 }: P) => svg(size, 2.4, <path d="M12 5v14M5 12h14" />)
export const MinusIcon = ({ size = 18 }: P) => svg(size, 2.4, <path d="M5 12h14" />)
export const UploadIcon = ({ size = 26 }: P) => svg(size, 2, <><path d="M12 16V4M6 10l6-6 6 6" /><path d="M4 20h16" /></>)
export const UndoIcon = ({ size = 18 }: P) => svg(size, 2.2, <><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>)
export const CheckIcon = ({ size = 18 }: P) => svg(size, 2.6, <path d="m5 12 5 5 9-10" />)
export const DesktopIcon = ({ size = 17 }: P) => svg(size, 2, <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>)
export const PhoneIcon = ({ size = 17 }: P) => svg(size, 2, <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></>)
export const SearchIcon = ({ size = 18 }: P) => svg(size, 2.2, <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>)
export const LogoutIcon = ({ size = 17 }: P) => svg(size, 2.1, <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>)
export const AlertIcon = ({ size = 18 }: P) => svg(size, 2.2, <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></>)
