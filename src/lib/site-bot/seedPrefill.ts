import type { NormalizedPlace } from '../places/client';
import type { CollectedData } from '../bot/prompts';
import { periodsToBusinessHours, type PrefillSnapshot } from './placePrefill';

export const FIXED_LOCATION_TYPES: string[] = [
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'store',
  'supermarket',
  'convenience_store',
  'pharmacy',
  'doctor',
  'dentist',
  'physiotherapist',
  'hospital',
  'clinic',
  'beauty_salon',
  'hair_salon',
  'gym',
  'school',
  'kindergarten',
  'library',
  'bank',
  'post_office',
  'shopping_mall',
  'clothing_store',
  'electronics_store',
  'furniture_store',
  'jewelry_store',
  'pet_store',
  'book_store',
  'florist',
  'laundry',
  'hair_care',
];

export const PREFILLABLE_KEYS: Array<keyof CollectedData> = [
  'businessName',
  'streetAddress',
  'targetLocation',
  'specificCities',
  'phone',
  'whatsappNumber',
  'serviceModel',
];

export function seedFromAudit(place: NormalizedPlace): Partial<CollectedData> {
  const result: Partial<CollectedData> = {};

  if (place.displayName && place.displayName.trim() !== '') {
    result.businessName = place.displayName;
  }

  if (place.formattedAddress && place.formattedAddress.trim() !== '') {
    result.streetAddress = place.formattedAddress;
  }

  if (place.city && place.city.trim() !== '') {
    result.targetLocation = place.city;
    result.specificCities = place.city;
  }

  const phone = (place.nationalPhoneNumber ?? place.internationalPhoneNumber)?.trim();
  if (phone) {
    result.phone = phone;
    result.whatsappNumber = phone;
  }

  if (place.primaryType && FIXED_LOCATION_TYPES.includes(place.primaryType)) {
    result.serviceModel = 'location';
  } else {
    result.serviceModel = 'field';
  }

  return result;
}

/**
 * Paid-journey v2 M1 (B11): sibling of seedFromAudit for the fresh Places Details
 * snapshot from /api/site-bot/prefill. Adds what the audit store never kept: the GBP
 * category (as businessNiche), opening hours (owner-hours format) and website. Everything
 * stays editable on the intake card. No rating or review: Places content is never
 * republished on client sites (reviews come from the owner's own GBP in M4).
 */
export function seedFromPrefillSnapshot(snapshot: PrefillSnapshot): Partial<CollectedData> {
  const result = seedFromAudit({ ...snapshot, types: snapshot.types ?? [] });
  const niche = snapshot.primaryTypeDisplayName?.trim();
  if (niche) result.businessNiche = niche;
  const hours = periodsToBusinessHours(snapshot.regularOpeningHours?.periods);
  if (hours) result.businessHours = hours;
  if (snapshot.websiteUri) result.websiteUri = snapshot.websiteUri;
  result.hasGoogleBusiness = true;
  return result;
}
