export interface BatcavePersona {
  name: string;
  emoji: string;
  avatar:
    | "batman"
    | "alfred"
    | "nightwing"
    | "batgirl"
    | "robin"
    | "oracle"
    | "redhood"
    | "lucius"
    | "catwoman"
    | "huntress";
}

export const BATCAVE_BRAND = {
  title: "ถ้ำค้างคาว",
  subtitle: "ศูนย์บัญชาการ",
  mobileSubtitle: "แดชบอร์ดเอเจนท์",
} as const;

const FIXED_PERSONAS: Record<string, BatcavePersona> = {
  main: { name: "แบทแมน", emoji: "🦇", avatar: "batman" },
  alfred: { name: "อัลเฟรด", emoji: "🫖", avatar: "alfred" },
  oracle: { name: "ออราเคิล", emoji: "🧠", avatar: "oracle" },
  nightwing: { name: "ไนท์วิง", emoji: "🌙", avatar: "nightwing" },
  robin: { name: "โรบิน", emoji: "🐦", avatar: "robin" },
  lucius: { name: "ลูเชียส ฟ็อกซ์", emoji: "🛠️", avatar: "lucius" },
};

const NAME_MATCHES: Array<{ pattern: RegExp; persona: BatcavePersona }> = [
  { pattern: /alfred|อัลเฟรด/i, persona: { name: "อัลเฟรด", emoji: "🫖", avatar: "alfred" } },
  { pattern: /oracle|ออราเคิล/i, persona: { name: "ออราเคิล", emoji: "🧠", avatar: "oracle" } },
  { pattern: /nightwing|ไนท์วิง/i, persona: { name: "ไนท์วิง", emoji: "🌙", avatar: "nightwing" } },
  { pattern: /batgirl|barbara|แบตเกิร์ล/i, persona: { name: "แบตเกิร์ล", emoji: "🦇", avatar: "batgirl" } },
  { pattern: /robin|tim|damian|โรบิน/i, persona: { name: "โรบิน", emoji: "🐦", avatar: "robin" } },
  { pattern: /red.?hood|jason|เรดฮูด/i, persona: { name: "เรดฮูด", emoji: "🎯", avatar: "redhood" } },
  { pattern: /lucius|fox|ลูเชียส/i, persona: { name: "ลูเชียส ฟ็อกซ์", emoji: "🛠️", avatar: "lucius" } },
  { pattern: /cat.?woman|selina|แคทวูแมน/i, persona: { name: "แคทวูแมน", emoji: "🐈", avatar: "catwoman" } },
  { pattern: /huntress|helena|ฮันเทรส/i, persona: { name: "ฮันเทรส", emoji: "🏹", avatar: "huntress" } },
];

const PERSONA_POOL: BatcavePersona[] = [
  { name: "ไนท์วิง", emoji: "🌙", avatar: "nightwing" },
  { name: "แบตเกิร์ล", emoji: "🦇", avatar: "batgirl" },
  { name: "โรบิน", emoji: "🐦", avatar: "robin" },
  { name: "ออราเคิล", emoji: "🧠", avatar: "oracle" },
  { name: "เรดฮูด", emoji: "🎯", avatar: "redhood" },
  { name: "ลูเชียส ฟ็อกซ์", emoji: "🛠️", avatar: "lucius" },
  { name: "แคทวูแมน", emoji: "🐈", avatar: "catwoman" },
  { name: "ฮันเทรส", emoji: "🏹", avatar: "huntress" },
];

function stableIndex(source: string, length: number): number {
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash % length;
}

export function getBatcavePersona(agentId: string, fallbackName?: string | null, _fallbackEmoji?: string | null): BatcavePersona {
  const normalizedId = agentId.trim().toLowerCase();
  if (FIXED_PERSONAS[normalizedId]) {
    return FIXED_PERSONAS[normalizedId];
  }

  const searchText = `${fallbackName || ""} ${agentId}`.trim();
  for (const entry of NAME_MATCHES) {
    if (entry.pattern.test(searchText)) {
      return entry.persona;
    }
  }

  const persona = PERSONA_POOL[stableIndex(normalizedId, PERSONA_POOL.length)];
  return {
    name: persona.name,
    emoji: persona.emoji,
    avatar: persona.avatar,
  };
}

const PIXEL_VARIANT_INDEX: Record<BatcavePersona["avatar"], number> = {
  batman: 0,
  alfred: 1,
  oracle: 2,
  nightwing: 3,
  robin: 4,
  lucius: 5,
  batgirl: 2,
  redhood: 4,
  catwoman: 3,
  huntress: 5,
};

export function getBatcavePixelVariant(agentId: string, fallbackName?: string | null, fallbackEmoji?: string | null): number {
  const persona = getBatcavePersona(agentId, fallbackName, fallbackEmoji);
  return PIXEL_VARIANT_INDEX[persona.avatar] ?? 0;
}
