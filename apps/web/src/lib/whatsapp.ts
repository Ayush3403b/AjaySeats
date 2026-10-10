/** Builds a click-to-chat link. The message is always URL-encoded; the number is digits only. */
export function buildWhatsAppUrl(number: string | null | undefined, message: string): string | null {
  if (!number || !/^\d{8,15}$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
