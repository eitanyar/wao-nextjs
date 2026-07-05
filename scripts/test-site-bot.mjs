/**
 * End-to-end test for the Site Bot MVP pipeline:
 *   generate → deploy → edit
 *
 * Requires the dev server running: npm run dev  (http://localhost:3000)
 *
 * Run from the wao/ directory:
 *   node scripts/test-site-bot.mjs
 */

const BASE = 'http://localhost:3000';
const SLUG = 'test-plumber-tlv';

const sampleCollectedData = {
  businessNiche: 'אינסטלטור',
  businessName: 'יוסי אינסטלציה',
  ownerName: 'יוסי כהן',
  secondaryServices: 'תיקון נזילות, התקנת דודי שמש',
  serviceModel: 'field',
  targetLocation: 'תל אביב',
  specificCities: 'תל אביב, גבעתיים, רמת גן',
  idealClient: 'בעל דירה עם נזילה דחופה',
  idealClientFear: 'הצפה בבית באמצע הלילה',
  faqQuestions: 'כמה זה עולה, כמה זמן לוקח להגיע, יש אחריות?',
  usp: 'מגיע תוך 20 דקות, 24 שעות ביממה',
  yearsInField: '15 שנה',
  guarantee: 'אחריות שנה על כל עבודה',
  license: 'מס\' 4821',
  exclusions: 'לא עובד על מערכות מים חמים תעשייתיות',
  urgencyLevel: 'urgent',
  responseTime: '20 דקות',
  pricingNotes: 'הצעת מחיר חינם, אין דמי הגעה',
  revenueModel: 'one-time',
  avgJobValue: 450,
  closeRate: 0.4,
  hasRepeatClients: true,
  reviewCount: 64,
  starRating: '4.9',
  hasGoogleBusiness: true,
  hasTrustAssets: true,
  reviewQuote: 'יוסי הציל אותי באמצע הלילה, הגיע תוך 15 דקות ופתר את הבעיה מיד. ממליץ בחום!',
  capacityAvailable: true,
  capacityUnit: '10 פניות בשבוע',
  contactMethod: 'טלפון או וואטסאפ',
  phone: '050-1234567',
  whatsappNumber: '050-1234567',
  email: 'yossi@example.com',
  preferredSlug: SLUG,
};

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${url} → HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('=== Site Bot E2E Test ===\n');

  console.log('Step 1: /api/site-bot/generate ...');
  const genResult = await post(`${BASE}/api/site-bot/generate`, {
    collectedData: sampleCollectedData,
    slug: SLUG,
  });
  console.log('  →', genResult);

  console.log('\nStep 2: /api/site-bot/deploy ...');
  const deployResult = await post(`${BASE}/api/site-bot/deploy`, { slug: genResult.slug || SLUG });
  console.log('  →', deployResult);
  console.log(`\n  Live URL: ${deployResult.url}`);
  console.log(`  Pages:    ${deployResult.url}/about.html`);
  console.log(`            ${deployResult.url}/services.html`);
  console.log(`            ${deployResult.url}/contact.html`);
  console.log(`            ${deployResult.url}/sitemap.xml`);

  console.log('\nStep 3: /api/site-bot/edit ...');
  const editResult = await post(`${BASE}/api/site-bot/edit`, {
    slug: genResult.slug || SLUG,
    instruction: "שנה את כותרת הגיבור ל'שרברב חירום 24/7 בתל אביב'",
  });
  console.log('  →', editResult);
  console.log(`\n  Updated URL: ${editResult.url} (field: ${editResult.updatedField})`);

  console.log('\n=== Done ===');
}

main().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
