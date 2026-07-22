import { buildWaLink } from '@/lib/geo/whatsapp';
import type { WeeklyDigest } from '@/lib/crm/intelligence';

export function composeWeeklyDigestWhatsAppMessage(params: {
  contactName: string;
  campaignName: string;
  digest: WeeklyDigest;
}): string {
  const { contactName, campaignName, digest } = params;
  const lines: string[] = [];

  lines.push(`שלום ${contactName},`);
  lines.push('');
  lines.push(`הסיכום השבועי של "${campaignName}" מוכן.`);
  lines.push('');
  lines.push(`לידים השבוע: ${digest.totals.leads}`);
  lines.push(`עסקאות שנסגרו: ${digest.totals.closedDeals}`);

  if (digest.alerts.length > 0) {
    lines.push('');
    lines.push(`⚠️ ${digest.alerts.length} דברים שכדאי לשים לב אליהם:`);
    digest.alerts.slice(0, 3).forEach((alert) => lines.push(`- ${alert.title}`));
  } else {
    lines.push('');
    lines.push('✅ הכל תקין השבוע — אין התראות פתוחות.');
  }

  if (digest.nextActions[0]) {
    lines.push('');
    lines.push('מה שהכי כדאי לעשות עכשיו:');
    lines.push(`▪️ ${digest.nextActions[0]}`);
  }

  lines.push('');
  lines.push('רוצה שנעדכן משהו? תגידו ונטפל.');

  return lines.join('\n');
}

export function buildWeeklyDigestWhatsAppLink(params: {
  contactPhone: string;
  contactName: string;
  campaignName: string;
  digest: WeeklyDigest;
}): string {
  const message = composeWeeklyDigestWhatsAppMessage(params);
  return buildWaLink(params.contactPhone, message);
}
