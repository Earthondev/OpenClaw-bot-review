import { getBatcavePersona, type BatcavePersona } from "@/lib/batcave";

type BatAvatarProps = {
  agentId?: string;
  name?: string | null;
  emoji?: string | null;
  size?: number;
  className?: string;
  title?: string;
};

type Palette = {
  frame: string;
  bg: string;
  bgAccent: string;
  body: string;
  face: string;
  neck: string;
  mask?: string;
  hair?: string;
  hairAccent?: string;
  eye?: string;
  visor?: string;
  accent: string;
  cape?: string;
  trim?: string;
  mouth?: string;
};

const PALETTES: Record<BatcavePersona["avatar"], Palette> = {
  batman: {
    frame: "#876319",
    bg: "#0c1424",
    bgAccent: "#1d2b44",
    body: "#111827",
    face: "#efc8a8",
    neck: "#d9b090",
    mask: "#0b1020",
    eye: "#d7ecff",
    accent: "#d0a429",
    cape: "#070b16",
    trim: "#2d3a5f",
    mouth: "#6f4737",
  },
  alfred: {
    frame: "#857660",
    bg: "#18202a",
    bgAccent: "#293444",
    body: "#283243",
    face: "#f0d4be",
    neck: "#dbb79f",
    hair: "#d6d7dd",
    hairAccent: "#8d919d",
    accent: "#f4f0e8",
    trim: "#10151c",
    mouth: "#6c4b3e",
  },
  nightwing: {
    frame: "#3051b8",
    bg: "#0f1730",
    bgAccent: "#18254c",
    body: "#101828",
    face: "#e0bf9c",
    neck: "#cda985",
    hair: "#121827",
    mask: "#1d4ed8",
    eye: "#eaf5ff",
    accent: "#2f8cff",
    trim: "#0d1220",
    mouth: "#6c4636",
  },
  batgirl: {
    frame: "#8c5adb",
    bg: "#160f28",
    bgAccent: "#2b1844",
    body: "#51279b",
    face: "#efc3a4",
    neck: "#d8ac8c",
    mask: "#101425",
    hair: "#ff8c3b",
    hairAccent: "#ffd29a",
    eye: "#dcedff",
    accent: "#ffd24d",
    cape: "#1c1036",
    mouth: "#764939",
  },
  robin: {
    frame: "#2c7a35",
    bg: "#182c19",
    bgAccent: "#2e4f30",
    body: "#b82727",
    face: "#efc49f",
    neck: "#d8ad88",
    hair: "#1a1a1a",
    mask: "#1f8f3d",
    eye: "#eef8ff",
    accent: "#f4c33d",
    cape: "#225f2f",
    trim: "#402d15",
    mouth: "#774939",
  },
  oracle: {
    frame: "#3d8a76",
    bg: "#102423",
    bgAccent: "#173835",
    body: "#1f6459",
    face: "#f1cab0",
    neck: "#ddb394",
    hair: "#d75043",
    hairAccent: "#ffb077",
    accent: "#6ef2cb",
    trim: "#0d1718",
    mouth: "#73463a",
  },
  redhood: {
    frame: "#a12828",
    bg: "#250d0d",
    bgAccent: "#3a1212",
    body: "#3c2a2a",
    face: "#d2d7e0",
    neck: "#a1a7b3",
    mask: "#b42222",
    visor: "#f3f5f8",
    accent: "#6c7a89",
    trim: "#1f1212",
  },
  lucius: {
    frame: "#56718a",
    bg: "#101a24",
    bgAccent: "#192838",
    body: "#2a3f58",
    face: "#6c4832",
    neck: "#593926",
    hair: "#232323",
    hairAccent: "#59616b",
    accent: "#dbeafe",
    trim: "#10151d",
    mouth: "#3b2419",
  },
  catwoman: {
    frame: "#6f8b61",
    bg: "#111417",
    bgAccent: "#21282e",
    body: "#101317",
    face: "#dce7ef",
    neck: "#c5d2db",
    mask: "#111317",
    visor: "#8ef2b8",
    accent: "#4fd28f",
    cape: "#090c10",
    trim: "#2d3742",
  },
  huntress: {
    frame: "#8f5bcf",
    bg: "#1a102a",
    bgAccent: "#2d1947",
    body: "#52278a",
    face: "#efc6aa",
    neck: "#d9b090",
    hair: "#1b1224",
    mask: "#5b2ea5",
    eye: "#e8f3ff",
    accent: "#c08cff",
    cape: "#2c1647",
    trim: "#1a1027",
    mouth: "#73483a",
  },
};

function renderVariant(variant: BatcavePersona["avatar"], palette: Palette) {
  if (variant === "batman") {
    return (
      <>
        <path d="M9 64 C12 49 20 39 32 39 C44 39 52 49 55 64 Z" fill={palette.cape} />
        <path d="M13 64 C16 49 22 41 32 41 C42 41 48 49 51 64 Z" fill={palette.body} />
        <rect x="28" y="35" width="8" height="6" rx="2" fill={palette.neck} />
        <path d="M17 22 L22 9 L27 18 L32 14 L37 18 L42 9 L47 22 L44 42 L20 42 Z" fill={palette.mask} />
        <path d="M25 23 C25 18 28 16 32 16 C36 16 39 18 39 23 L39 33 C39 37 36 40 32 40 C28 40 25 37 25 33 Z" fill={palette.face} />
        <rect x="24" y="26" width="6" height="2" rx="1" fill={palette.eye} />
        <rect x="34" y="26" width="6" height="2" rx="1" fill={palette.eye} />
        <rect x="30" y="32" width="4" height="1.5" rx="0.75" fill={palette.mouth} />
        <path d="M23 48 L32 45 L41 48 L36 52 L28 52 Z" fill={palette.accent} />
      </>
    );
  }

  if (variant === "alfred") {
    return (
      <>
        <path d="M13 64 C17 49 23 42 32 42 C41 42 47 49 51 64 Z" fill={palette.body} />
        <path d="M26 45 L32 50 L38 45 L42 64 L22 64 Z" fill={palette.accent} />
        <rect x="28" y="35" width="8" height="6" rx="2" fill={palette.neck} />
        <path d="M22 16 C24 11 28 8 32 8 C36 8 40 11 42 16 L42 31 C42 37 37 41 32 41 C27 41 22 37 22 31 Z" fill={palette.face} />
        <path d="M20 16 C22 10 26 7 32 7 C38 7 42 10 44 16 L42 19 L39 15 L39 26 L25 26 L25 15 L22 19 Z" fill={palette.hair} />
        <path d="M21 18 L25 16 L25 30 L21 28 Z" fill={palette.hairAccent} />
        <path d="M43 18 L39 16 L39 30 L43 28 Z" fill={palette.hairAccent} />
        <rect x="26" y="24" width="4" height="2" rx="1" fill="#263238" />
        <rect x="34" y="24" width="4" height="2" rx="1" fill="#263238" />
        <rect x="30" y="24" width="4" height="1" rx="0.5" fill="#263238" />
        <path d="M28 31 C29 33 31 34 32 34 C33 34 35 33 36 31" stroke={palette.mouth} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M28 34 C29 36 31 37 32 37 C33 37 35 36 36 34" stroke="#5b4035" strokeWidth="1.5" strokeLinecap="round" />
      </>
    );
  }

  if (variant === "nightwing") {
    return (
      <>
        <path d="M12 64 C16 49 22 42 32 42 C42 42 48 49 52 64 Z" fill={palette.body} />
        <path d="M24 47 L32 44 L40 47 L36 50 L32 48 L28 50 Z" fill={palette.accent} />
        <path d="M18 22 C20 13 25 8 32 8 C39 8 44 13 46 22 L44 32 C42 38 38 41 32 41 C26 41 22 38 20 32 Z" fill={palette.face} />
        <path d="M17 20 C19 12 25 7 32 7 C39 7 45 12 47 20 L44 19 L42 24 L22 24 L20 19 Z" fill={palette.hair} />
        <path d="M19 23 L25 21 L32 23 L39 21 L45 23 L42 28 L37 28 L32 26 L27 28 L22 28 Z" fill={palette.mask} />
        <rect x="24" y="25" width="5" height="2" rx="1" fill={palette.eye} />
        <rect x="35" y="25" width="5" height="2" rx="1" fill={palette.eye} />
        <rect x="29.5" y="33" width="5" height="1.5" rx="0.75" fill={palette.mouth} />
      </>
    );
  }

  if (variant === "batgirl") {
    return (
      <>
        <path d="M11 64 C15 48 22 40 32 40 C42 40 49 48 53 64 Z" fill={palette.cape} />
        <path d="M14 64 C18 49 24 42 32 42 C40 42 46 49 50 64 Z" fill={palette.body} />
        <path d="M21 24 C22 14 26 9 32 9 C38 9 42 14 43 24 L42 32 C41 38 37 41 32 41 C27 41 23 38 22 32 Z" fill={palette.face} />
        <path d="M17 22 L22 9 L27 18 L32 14 L37 18 L42 9 L47 22 L44 27 L44 41 L20 41 L20 27 Z" fill={palette.mask} />
        <path d="M18 31 C19 38 23 44 27 47 L22 50 C17 45 14 39 14 33 Z" fill={palette.hair} />
        <path d="M46 31 C45 38 41 44 37 47 L42 50 C47 45 50 39 50 33 Z" fill={palette.hair} />
        <rect x="24" y="26" width="6" height="2" rx="1" fill={palette.eye} />
        <rect x="34" y="26" width="6" height="2" rx="1" fill={palette.eye} />
        <rect x="28" y="48" width="8" height="3" rx="1.5" fill={palette.accent} />
        <rect x="29.5" y="33" width="5" height="1.5" rx="0.75" fill={palette.mouth} />
      </>
    );
  }

  if (variant === "robin") {
    return (
      <>
        <path d="M10 64 C13 48 20 41 32 41 C44 41 51 48 54 64 Z" fill={palette.cape} />
        <path d="M15 64 C19 49 24 42 32 42 C40 42 45 49 49 64 Z" fill={palette.body} />
        <path d="M18 22 C20 13 25 8 32 8 C39 8 44 13 46 22 L44 31 C42 38 38 41 32 41 C26 41 22 38 20 31 Z" fill={palette.face} />
        <path d="M18 18 C22 11 26 8 32 8 C38 8 42 11 46 18 L43 21 L40 18 L24 18 L21 21 Z" fill={palette.hair} />
        <path d="M19 22 L24 20 L32 22 L40 20 L45 22 L42 28 L22 28 Z" fill={palette.mask} />
        <rect x="24" y="25" width="5" height="2" rx="1" fill={palette.eye} />
        <rect x="35" y="25" width="5" height="2" rx="1" fill={palette.eye} />
        <path d="M18 44 L24 40 L32 43 L40 40 L46 44 L42 47 L22 47 Z" fill={palette.accent} />
        <rect x="29.5" y="33" width="5" height="1.5" rx="0.75" fill={palette.mouth} />
      </>
    );
  }

  if (variant === "oracle") {
    return (
      <>
        <path d="M13 64 C17 49 23 42 32 42 C41 42 47 49 51 64 Z" fill={palette.body} />
        <path d="M20 16 C23 10 27 8 32 8 C37 8 41 10 44 16 L44 31 C44 37 38 41 32 41 C26 41 20 37 20 31 Z" fill={palette.face} />
        <path d="M18 17 C20 11 25 7 32 7 C39 7 44 11 46 17 L44 19 L41 14 L23 14 L20 19 Z" fill={palette.hair} />
        <path d="M18 18 C16 26 17 33 21 40 L17 44 C12 37 11 25 14 18 Z" fill={palette.hairAccent} />
        <path d="M46 18 C48 26 47 33 43 40 L47 44 C52 37 53 25 50 18 Z" fill={palette.hairAccent} />
        <rect x="23" y="23" width="8" height="6" rx="2" fill="#22343a" />
        <rect x="33" y="23" width="8" height="6" rx="2" fill="#22343a" />
        <rect x="31" y="25" width="2" height="1.5" rx="0.75" fill="#22343a" />
        <rect x="24" y="24" width="6" height="4" rx="1.5" fill={palette.accent} opacity="0.25" />
        <rect x="34" y="24" width="6" height="4" rx="1.5" fill={palette.accent} opacity="0.25" />
        <rect x="29.5" y="32" width="5" height="1.5" rx="0.75" fill={palette.mouth} />
      </>
    );
  }

  if (variant === "redhood") {
    return (
      <>
        <path d="M12 64 C16 49 22 42 32 42 C42 42 48 49 52 64 Z" fill={palette.body} />
        <rect x="27" y="35" width="10" height="6" rx="2" fill={palette.neck} />
        <path d="M18 17 C21 10 26 7 32 7 C38 7 43 10 46 17 L44 33 C42 39 37 42 32 42 C27 42 22 39 20 33 Z" fill={palette.mask} />
        <rect x="24" y="23" width="16" height="5" rx="2.5" fill={palette.visor} />
        <rect x="27" y="31" width="10" height="2" rx="1" fill="#701818" />
        <rect x="24" y="48" width="16" height="4" rx="2" fill={palette.accent} />
      </>
    );
  }

  if (variant === "lucius") {
    return (
      <>
        <path d="M14 64 C18 49 23 42 32 42 C41 42 46 49 50 64 Z" fill={palette.body} />
        <path d="M21 16 C23 10 27 8 32 8 C37 8 41 10 43 16 L43 31 C43 37 38 41 32 41 C26 41 21 37 21 31 Z" fill={palette.face} />
        <path d="M19 17 C21 11 26 7 32 7 C38 7 43 11 45 17 L43 19 L40 14 L24 14 L21 19 Z" fill={palette.hair} />
        <rect x="23" y="23" width="8" height="5" rx="2" fill="#102030" />
        <rect x="33" y="23" width="8" height="5" rx="2" fill="#102030" />
        <rect x="31" y="24.5" width="2" height="1" rx="0.5" fill="#102030" />
        <rect x="24" y="24" width="6" height="3" rx="1" fill={palette.accent} opacity="0.2" />
        <rect x="34" y="24" width="6" height="3" rx="1" fill={palette.accent} opacity="0.2" />
        <rect x="29.5" y="32" width="5" height="1.5" rx="0.75" fill={palette.mouth} />
        <rect x="28" y="47" width="8" height="4" rx="2" fill={palette.accent} />
      </>
    );
  }

  if (variant === "catwoman") {
    return (
      <>
        <path d="M11 64 C15 49 22 42 32 42 C42 42 49 49 53 64 Z" fill={palette.cape} />
        <path d="M15 64 C19 49 24 42 32 42 C40 42 45 49 49 64 Z" fill={palette.body} />
        <path d="M18 19 L22 8 L28 17 L32 12 L36 17 L42 8 L46 19 L44 34 C42 39 37 42 32 42 C27 42 22 39 20 34 Z" fill={palette.mask} />
        <path d="M24 23 C24 18 28 16 32 16 C36 16 40 18 40 23 L40 33 C40 37 36 40 32 40 C28 40 24 37 24 33 Z" fill={palette.face} />
        <rect x="23" y="23" width="18" height="6" rx="3" fill={palette.visor} />
        <rect x="25" y="24" width="14" height="4" rx="2" fill="#083a2a" opacity="0.55" />
        <rect x="29.5" y="33" width="5" height="1.5" rx="0.75" fill="#61727d" />
      </>
    );
  }

  return (
    <>
      <path d="M11 64 C15 49 22 42 32 42 C42 42 49 49 53 64 Z" fill={palette.cape} />
      <path d="M15 64 C19 49 24 42 32 42 C40 42 45 49 49 64 Z" fill={palette.body} />
      <path d="M19 16 C23 10 27 8 32 8 C37 8 41 10 45 16 L43 20 L40 18 L24 18 L21 20 Z" fill={palette.hair} />
      <path d="M19 20 C21 13 26 8 32 8 C38 8 43 13 45 20 L43 31 C41 38 37 41 32 41 C27 41 23 38 21 31 Z" fill={palette.face} />
      <path d="M19 22 L24 20 L32 22 L40 20 L45 22 L42 28 L22 28 Z" fill={palette.mask} />
      <rect x="24" y="25" width="5" height="2" rx="1" fill={palette.eye} />
      <rect x="35" y="25" width="5" height="2" rx="1" fill={palette.eye} />
      <rect x="29.5" y="33" width="5" height="1.5" rx="0.75" fill={palette.mouth} />
    </>
  );
}

export function BatAvatar({
  agentId = "",
  name,
  emoji,
  size = 36,
  className = "",
  title,
}: BatAvatarProps) {
  const persona = getBatcavePersona(agentId, name, emoji);
  const palette = PALETTES[persona.avatar];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_0_1px_rgba(0,0,0,0.1)] ${className}`.trim()}
      style={{
        width: size,
        height: size,
        borderColor: `${palette.frame}AA`,
        background: `linear-gradient(180deg, ${palette.bgAccent} 0%, ${palette.bg} 100%)`,
      }}
      title={title || name || persona.name}
      aria-label={title || name || persona.name}
      data-character={persona.avatar}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        role="img"
        aria-hidden="true"
        shapeRendering="geometricPrecision"
      >
        <rect x="0" y="0" width="64" height="64" rx="14" fill={palette.bg} />
        <path d="M0 12 C12 0 26 0 64 10 L64 0 L0 0 Z" fill={palette.bgAccent} opacity="0.65" />
        <path d="M0 64 C15 52 28 49 64 58 L64 64 Z" fill={palette.frame} opacity="0.18" />
        {renderVariant(persona.avatar, palette)}
      </svg>
    </span>
  );
}
