import type { NormalizedPlace } from '../places/client';
import type { CollectedData } from '../bot/prompts';

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
