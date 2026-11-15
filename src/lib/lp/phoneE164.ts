// Israeli phone numbers in E.164 (+972...). Shared by the Site Bot renderers and the LocalBusiness schema.
// HEBREW-SAFETY: ZERO Hebrew bytes.

/**
 * tel: href in E.164 for an Israeli number (national 0XXXXXXXX / 0XXXXXXXXX, or +972 / 972 forms), else null
 * (the hero call button is then omitted; the header keeps its legacy link).
 */
export function israeliPhoneE164(raw: string | undefined): string | null {
  const compact = (raw ?? '').replace(/[^\d+]/g, '');
  const national = compact.startsWith('+972') ? `0${compact.slice(4)}` : compact.startsWith('972') ? `0${compact.slice(3)}` : compact;
  return /^0[1-9]\d{7,8}$/.test(national) ? `+972${national.slice(1)}` : null;
}
