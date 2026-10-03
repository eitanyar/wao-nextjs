// Per-process UTC-day accounting; reserve before each outbound Places attempt.
let day = '';
let used = 0;

function ceiling(): number {
  const raw = process.env.GBP_MAGNET_DAILY_PLACES_CEILING;
  if (!raw || !/^[1-9]\d*$/.test(raw)) return 200;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : 200;
}

export function reserveDailyPlacesCalls(n: number): boolean {
  if (!Number.isSafeInteger(n) || n < 1) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (day !== today) { day = today; used = 0; }
  if (n > ceiling() - used) return false;
  used += n;
  return true;
}

export function resetDailyPlacesCounter(): void {
  day = '';
  used = 0;
}
