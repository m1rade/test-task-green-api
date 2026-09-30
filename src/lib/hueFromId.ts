/** Stable pastel hue per chat, like WhatsApp's colored default avatars */
export function hueFromId(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 360
}
