/**
 * Display names are shown to other players, so a name that is plainly offensive is refused when it is saved.
 * This is a first line only: it catches obvious sexual, violent and hateful words (also written in katakana,
 * full-width letters or with symbols between the characters). Everything else is handled by reports and blocks.
 * The operator can add words with the NG_WORDS setting (comma-separated) without a new release of the app.
 */
const BUILT_IN = [
  // violence and self-harm (short words that sit inside ordinary names, such as "しね" in "シネマ", are left out on purpose)
  "死ね", "氏ね", "殺す", "殺せ", "殺し", "しねよ", "しんでしまえ", "しんじまえ", "ころす", "ころされ", "ぶっころ", "さつがい", "じさつ", "ばくだん",
  // sexual
  "せっくす", "ちんこ", "ちんぽ", "ちんちん", "まんこ", "おっぱい", "ぱいずり", "ふぇらちお", "なかだし", "れいぷ", "ごうかんま", "あなる", "おなにー", "ぽるの", "やりまん", "ふぁっく", "ちかん",
  // insults and hate
  "きちがい", "かたわ", "ちょんこ", "ちゃんころ", "しなちく", "ぶさいく", "きもい", "うざい", "ひきにーと",
  // other languages
  "fuck", "bitch", "nigg", "pussy", "cunt", "nazi", "suicide", "porn"
];

/** Katakana to hiragana, full-width to half-width, lower case, and no symbols or spaces, so small disguises do not hide a word. */
export function normalizeName(value: string): string {
  const folded = value.normalize("NFKC").toLowerCase();
  const hiragana = folded.replace(/[ァ-ヶ]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60));
  return hiragana.replace(/[^\p{L}\p{N}]/gu, "");
}

/** Whether a display name may be used. `extra` is the operator's own comma-separated list. */
export function isNameAllowed(name: string, extra?: string): boolean {
  const normalized = normalizeName(name);
  if (!normalized) return false;
  const words = [...BUILT_IN, ...(extra ?? "").split(",").map((word) => word.trim()).filter(Boolean)].map(normalizeName).filter(Boolean);
  return !words.some((word) => normalized.includes(word));
}
