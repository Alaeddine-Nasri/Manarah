// All SVG icon components for Manarah

function Icon({ size = 18, color = 'currentColor', children, viewBox = '0 0 24 24' }) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
    >
      {children}
    </svg>
  );
}

export function Lighthouse({ size = 18, color = 'currentColor' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      {/* Base */}
      <path d="M9 21h6" />
      {/* Tower body */}
      <path d="M10 21V12l-2 2V9l2-3h4l2 3v5l-2-2v9" />
      {/* Light room */}
      <rect x="9" y="5" width="6" height="4" rx="1" />
      {/* Light rays */}
      <line x1="12" y1="5" x2="12" y2="3" />
      <line x1="17" y1="7" x2="19" y2="6" />
      <line x1="7" y1="7" x2="5" y2="6" />
    </svg>
  );
}

export function Dashboard({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Icon>
  );
}

export function Students({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

export function Teachers({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
      <path d="M12 12v4" />
      <path d="M10 16h4" />
    </Icon>
  );
}

export function Sessions({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </Icon>
  );
}

export function Attendance({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </Icon>
  );
}

export function Payments({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </Icon>
  );
}

export function Expenses({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Icon>
  );
}

export function Settings({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  );
}

export function Search({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Icon>
  );
}

export function Bell({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Icon>
  );
}

export function Moon({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icon>
  );
}

export function Sun({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </Icon>
  );
}

export function Globe({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </Icon>
  );
}

export function ChevronRight({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <polyline points="9 18 15 12 9 6" />
    </Icon>
  );
}

export function ChevronLeft({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <polyline points="15 18 9 12 15 6" />
    </Icon>
  );
}

export function ChevronDown({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <polyline points="6 9 12 15 18 9" />
    </Icon>
  );
}

export function X({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icon>
  );
}

export function Plus({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Icon>
  );
}

export function Edit({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Icon>
  );
}

export function Trash({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </Icon>
  );
}

export function MoreHorizontal({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="12" cy="12" r="1" fill={color} />
      <circle cx="19" cy="12" r="1" fill={color} />
      <circle cx="5" cy="12" r="1" fill={color} />
    </Icon>
  );
}

export function Check({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  );
}

export function AlertCircle({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </Icon>
  );
}

export function TrendingUp({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </Icon>
  );
}

export function Users({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

export function Calendar({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </Icon>
  );
}

export function DollarSign({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Icon>
  );
}

export function BookOpen({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Icon>
  );
}

export function Clock({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Icon>
  );
}

export function Filter({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </Icon>
  );
}

export function Download({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Icon>
  );
}

export function Upload({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </Icon>
  );
}

export function Eye({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function QrCode({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3z" />
      <path d="M17 17h3v3h-3z" />
      <path d="M14 20h3" />
      <path d="M17 14h3v3" />
    </Icon>
  );
}

export function Layers({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </Icon>
  );
}

export function History({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
      <polyline points="12 7 12 12 15 14" />
    </Icon>
  );
}

export function Payroll({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </Icon>
  );
}

export function CreditCard({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </Icon>
  );
}

export function Percent({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </Icon>
  );
}

export function LogOut({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Icon>
  );
}

export function Key({ size = 18, color = 'currentColor' }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2L13 10" />
      <path d="M19 4L21 6" />
      <path d="M15 8L17 10" />
    </Icon>
  );
}
