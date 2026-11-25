/**
 * Site Bot ads-first launch, build step 1: the trades Site Bot builds for at launch, keyed by GBP category id (gcid:*).
 *
 * Scope source: VISION.md "Segment scope, resolved for launch" (Yonatan + Gil, 2026-08-21): field trades (plumber,
 * electrician class: the van / service-radius model), in-home tutors, and photographer. Everything else (storefronts,
 * clinics, restaurants, offices, schools, online-only services) is outside launch scope and gets the trade waiting list.
 *
 * The ids are the ones in src/data/gbp-categories-il.json. The audit stores the Places `primaryType` (for the trades that
 * ARE Places types the id equals the gcid suffix, e.g. 'plumber' -> gcid:plumber), with PLACES_TYPE_ALIASES for the Places
 * ids that differ from the GBP id. Most launch gcids are NOT Places types (Places reports them as 'service' or nothing),
 * so the scope decision is profileEligibility.ts tradeScope(): block only on an explicitly out-of-scope primary category.
 *
 * Changing the list is a positioning call (owner: seo-strategist / Adam), not an engineering one: edit only on sign-off,
 * and keep launchTrades.test.ts in step.
 *
 * Pure and browser-safe. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

export type LaunchTradeGroup = 'field_trade' | 'in_home_tutor' | 'photographer';

export const LAUNCH_TRADE_CATEGORIES = {
  // Field trades: plumbing, drains, heating
  'gcid:plumber': 'field_trade',
  'gcid:drainage_service': 'field_trade',
  'gcid:sewage_disposal_service': 'field_trade',
  'gcid:heating_contractor': 'field_trade',
  'gcid:water_damage_restoration_service': 'field_trade',
  // Field trades: electrical
  'gcid:electrician': 'field_trade',
  'gcid:electrical_installation_service': 'field_trade',
  'gcid:lighting_contractor': 'field_trade',
  'gcid:generator_repair_service': 'field_trade',
  // Field trades: locks, AC, appliances, security
  'gcid:locksmith': 'field_trade',
  'gcid:hvac_contractor': 'field_trade',
  'gcid:air_conditioning_repair_service': 'field_trade',
  'gcid:air_duct_cleaning_service': 'field_trade',
  'gcid:appliance_repair_service': 'field_trade',
  'gcid:security_system_installer': 'field_trade',
  // Field trades: building finishes and repairs at the customer's home
  'gcid:handyman': 'field_trade',
  'gcid:painter': 'field_trade',
  'gcid:plasterer': 'field_trade',
  'gcid:dry_wall_contractor': 'field_trade',
  'gcid:tile_contractor': 'field_trade',
  'gcid:flooring_contractor': 'field_trade',
  'gcid:carpenter': 'field_trade',
  'gcid:glazier': 'field_trade',
  'gcid:window_installation_service': 'field_trade',
  'gcid:roofer': 'field_trade',
  'gcid:waterproofing_service': 'field_trade',
  'gcid:insulation_contractor': 'field_trade',
  'gcid:soundproofing_contractor': 'field_trade',
  'gcid:fence_contractor': 'field_trade',
  'gcid:bathroom_remodeler': 'field_trade',
  'gcid:general_contractor': 'field_trade',
  // Field trades: home services
  'gcid:pest_control_service': 'field_trade',
  'gcid:moving_company': 'field_trade',
  'gcid:house_cleaning_service': 'field_trade',
  'gcid:carpet_cleaning_service': 'field_trade',
  'gcid:window_cleaning_service': 'field_trade',
  'gcid:gardener': 'field_trade',
  'gcid:tree_service': 'field_trade',
  'gcid:pool_cleaning_service': 'field_trade',
  'gcid:solar_energy_contractor': 'field_trade',
  'gcid:solar_panel_cleaning_service': 'field_trade',
  // Field trades added on seo-strategist sign-off 2026-11-25 (Yonatan)
  'gcid:cleaner': 'field_trade',
  'gcid:deck_builder': 'field_trade',
  'gcid:metal_fabricator': 'field_trade',
  'gcid:kitchen_remodeler': 'field_trade',
  'gcid:landscape_designer': 'field_trade',
  'gcid:swimming_pool_contractor': 'field_trade',
  'gcid:solar_energy_equipment_supplier': 'field_trade',
  // In-home tutors (storefront and online-only tutoring are out of this wave)
  'gcid:tutoring_service': 'in_home_tutor',
  // Photographer (studio + on-location hybrid)
  'gcid:photographer': 'photographer',
} as const satisfies Record<string, LaunchTradeGroup>;

export type LaunchTradeCategoryId = keyof typeof LAUNCH_TRADE_CATEGORIES;

/** Places type ids that are not the gcid suffix of the same GBP category. */
export const PLACES_TYPE_ALIASES: Readonly<Record<string, string>> = {
  roofing_contractor: 'gcid:roofer',
  // Seen live 2026-11-25 (fixtures/places-trade-scope-2026-11-25.json): Israeli dentists report primaryType dental_clinic.
  dental_clinic: 'gcid:dentist',
};

/** Places types that say nothing about the trade; never treated as a primary category. */
export const GENERIC_PLACES_TYPES: ReadonlySet<string> = new Set(['point_of_interest', 'establishment', 'store', 'service', 'premise', 'food', 'health']);

/**
 * Places primaryType values that put a business OUT of launch scope (seo-strategist sign-off, Yonatan 2026-11-25:
 * docs/reviews/site-bot-places-type-block-list-yonatan-2026-11-25.md; source: Places API (New) Table A, fetched
 * 2026-11-25). Applied to primaryType ONLY (secondary `types` are noisy and never block), before the display-name and
 * `types` branches of profileEligibility.ts tradeScope(). A type on neither this list nor the launch list still passes,
 * so a new Google type is never blocked until it is listed here. Changing it is a positioning call, not an engineering one.
 */
export const PLACES_PRIMARY_TYPE_BLOCK: ReadonlySet<string> = new Set([
  // Food and Drink
  'acai_shop', 'afghani_restaurant', 'african_restaurant', 'american_restaurant', 'argentinian_restaurant',
  'asian_fusion_restaurant', 'asian_restaurant', 'australian_restaurant', 'austrian_restaurant', 'bagel_shop',
  'bakery', 'bangladeshi_restaurant', 'bar', 'bar_and_grill', 'barbecue_restaurant', 'basque_restaurant',
  'bavarian_restaurant', 'beer_garden', 'belgian_restaurant', 'bistro', 'brazilian_restaurant',
  'breakfast_restaurant', 'brewery', 'brewpub', 'british_restaurant', 'brunch_restaurant', 'buffet_restaurant',
  'burmese_restaurant', 'burrito_restaurant', 'cafe', 'cafeteria', 'cajun_restaurant', 'cake_shop',
  'californian_restaurant', 'cambodian_restaurant', 'candy_store', 'cantonese_restaurant', 'caribbean_restaurant',
  'cat_cafe', 'chicken_restaurant', 'chicken_wings_restaurant', 'chilean_restaurant', 'chinese_noodle_restaurant',
  'chinese_restaurant', 'chocolate_factory', 'chocolate_shop', 'cocktail_bar', 'coffee_roastery', 'coffee_shop',
  'coffee_stand', 'colombian_restaurant', 'confectionery', 'croatian_restaurant', 'cuban_restaurant',
  'czech_restaurant', 'danish_restaurant', 'deli', 'dessert_restaurant', 'dessert_shop', 'dim_sum_restaurant',
  'diner', 'dog_cafe', 'donut_shop', 'dumpling_restaurant', 'dutch_restaurant', 'eastern_european_restaurant',
  'ethiopian_restaurant', 'european_restaurant', 'falafel_restaurant', 'family_restaurant', 'fast_food_restaurant',
  'filipino_restaurant', 'fine_dining_restaurant', 'fish_and_chips_restaurant', 'fondue_restaurant', 'food_court',
  'french_restaurant', 'fusion_restaurant', 'gastropub', 'german_restaurant', 'greek_restaurant', 'gyro_restaurant',
  'halal_restaurant', 'hamburger_restaurant', 'hawaiian_restaurant', 'hookah_bar', 'hot_dog_restaurant',
  'hot_dog_stand', 'hot_pot_restaurant', 'hungarian_restaurant', 'ice_cream_shop', 'indian_restaurant',
  'indonesian_restaurant', 'irish_pub', 'irish_restaurant', 'israeli_restaurant', 'italian_restaurant',
  'japanese_curry_restaurant', 'japanese_izakaya_restaurant', 'japanese_restaurant', 'juice_shop', 'kebab_shop',
  'korean_barbecue_restaurant', 'korean_restaurant', 'latin_american_restaurant', 'lebanese_restaurant',
  'lounge_bar', 'malaysian_restaurant', 'meal_delivery', 'meal_takeaway', 'mediterranean_restaurant',
  'mexican_restaurant', 'middle_eastern_restaurant', 'mongolian_barbecue_restaurant', 'moroccan_restaurant',
  'noodle_shop', 'north_indian_restaurant', 'oyster_bar_restaurant', 'pakistani_restaurant', 'pastry_shop',
  'persian_restaurant', 'peruvian_restaurant', 'pizza_delivery', 'pizza_restaurant', 'polish_restaurant',
  'portuguese_restaurant', 'pub', 'ramen_restaurant', 'restaurant', 'romanian_restaurant', 'russian_restaurant',
  'salad_shop', 'sandwich_shop', 'scandinavian_restaurant', 'seafood_restaurant', 'shawarma_restaurant', 'snack_bar',
  'soul_food_restaurant', 'soup_restaurant', 'south_american_restaurant', 'south_indian_restaurant',
  'southwestern_us_restaurant', 'spanish_restaurant', 'sports_bar', 'sri_lankan_restaurant', 'steak_house',
  'sushi_restaurant', 'swiss_restaurant', 'taco_restaurant', 'taiwanese_restaurant', 'tapas_restaurant', 'tea_house',
  'tex_mex_restaurant', 'thai_restaurant', 'tibetan_restaurant', 'tonkatsu_restaurant', 'turkish_restaurant',
  'ukrainian_restaurant', 'vegan_restaurant', 'vegetarian_restaurant', 'vietnamese_restaurant', 'western_restaurant',
  'wine_bar', 'winery', 'yakiniku_restaurant', 'yakitori_restaurant',
  // Lodging
  'bed_and_breakfast', 'budget_japanese_inn', 'campground', 'camping_cabin', 'cottage', 'extended_stay_hotel',
  'farmstay', 'guest_house', 'hostel', 'hotel', 'inn', 'japanese_inn', 'lodging', 'mobile_home_park', 'motel',
  'private_guest_room', 'resort_hotel', 'rv_park',
  // Government
  'city_hall', 'courthouse', 'embassy', 'fire_station', 'government_office', 'local_government_office',
  'neighborhood_police_station', 'police', 'post_office',
  // Places of Worship
  'buddhist_temple', 'church', 'hindu_temple', 'mosque', 'shinto_shrine', 'synagogue',
  // Geographical Areas
  'administrative_area_level_1', 'administrative_area_level_2', 'country', 'locality', 'postal_code',
  'school_district',
  // Natural Features
  'beach', 'island', 'lake', 'mountain_peak', 'nature_preserve', 'river', 'scenic_spot', 'woods',
  // Housing
  'apartment_building', 'apartment_complex', 'condominium_complex', 'housing_complex',
  // Facilities
  'public_bath', 'public_bathroom', 'stable',
  // Culture (except art_studio)
  'art_gallery', 'art_museum', 'auditorium', 'castle', 'cultural_landmark', 'fountain', 'historical_place',
  'history_museum', 'monument', 'museum', 'performing_arts_theater', 'sculpture',
  // Sports
  'arena', 'athletic_field', 'fishing_charter', 'fishing_pier', 'fishing_pond', 'fitness_center', 'golf_course',
  'gym', 'ice_skating_rink', 'indoor_golf_course', 'playground', 'race_course', 'ski_resort',
  'sports_activity_location', 'sports_club', 'sports_coaching', 'sports_complex', 'sports_school', 'stadium',
  'swimming_pool', 'tennis_court',
  // Entertainment and Recreation
  'adventure_sports_center', 'amphitheatre', 'amusement_center', 'amusement_park', 'aquarium', 'banquet_hall',
  'barbecue_area', 'botanical_garden', 'bowling_alley', 'casino', 'childrens_camp', 'city_park', 'comedy_club',
  'community_center', 'concert_hall', 'convention_center', 'cultural_center', 'cycling_park', 'dance_hall',
  'dog_park', 'event_venue', 'ferris_wheel', 'garden', 'go_karting_venue', 'hiking_area', 'historical_landmark',
  'indoor_playground', 'internet_cafe', 'karaoke', 'live_music_venue', 'marina', 'miniature_golf_course',
  'movie_rental', 'movie_theater', 'national_park', 'night_club', 'observation_deck', 'off_roading_area',
  'opera_house', 'paintball_center', 'park', 'philharmonic_hall', 'picnic_ground', 'planetarium', 'plaza',
  'roller_coaster', 'skateboard_park', 'state_park', 'tourist_attraction', 'video_arcade', 'vineyard',
  'visitor_center', 'water_park', 'wedding_venue', 'wildlife_park', 'wildlife_refuge', 'zoo',
  // Transportation (except transportation_service; includes taxi_service)
  'airport', 'airstrip', 'bike_sharing_station', 'bridge', 'bus_station', 'bus_stop', 'ferry_service',
  'ferry_terminal', 'heliport', 'international_airport', 'light_rail_station', 'park_and_ride', 'subway_station',
  'taxi_service', 'taxi_stand', 'toll_station', 'train_station', 'train_ticket_office', 'tram_stop', 'transit_depot',
  'transit_station', 'transit_stop', 'truck_stop',
  // Finance
  'accounting', 'atm', 'bank',
  // Automotive
  'car_dealer', 'car_rental', 'car_repair', 'car_wash', 'tire_shop', 'truck_dealer', 'gas_station', 'parking',
  'parking_garage', 'parking_lot', 'rest_stop', 'electric_vehicle_charging_station', 'ebike_charging_station',
  // Health and Wellness
  'chiropractor', 'dental_clinic', 'dentist', 'doctor', 'drugstore', 'general_hospital', 'hospital', 'massage',
  'massage_spa', 'medical_center', 'medical_clinic', 'medical_lab', 'pharmacy', 'physiotherapist', 'sauna',
  'skin_care_clinic', 'spa', 'tanning_studio', 'wellness_center', 'yoga_studio',
  // Education
  'school', 'primary_school', 'secondary_school', 'preschool', 'university', 'academic_department',
  'research_institute', 'library',
  // Beauty
  'beauty_salon', 'beautician', 'barber_shop', 'hair_salon', 'hair_care', 'nail_salon', 'makeup_artist',
  'body_art_service', 'foot_care',
  // Other Services
  'lawyer', 'insurance_agency', 'real_estate_agency', 'travel_agency', 'tour_agency', 'tourist_information_center',
  'employment_agency', 'consultant', 'marketing_consultant', 'telecommunications_service_provider', 'funeral_home',
  'cemetery', 'florist', 'tailor', 'catering_service', 'food_delivery', 'veterinary_care', 'pet_care',
  'pet_boarding_service', 'child_care_agency', 'summer_camp_organizer', 'astrologer', 'psychic',
  'aircraft_rental_service', 'chauffeur_service', 'association_or_organization', 'non_profit_organization',
  // Shopping
  'asian_grocery_store', 'auto_parts_store', 'bicycle_store', 'book_store', 'butcher_shop', 'cell_phone_store',
  'clothing_store', 'convenience_store', 'cosmetics_store', 'department_store', 'discount_store',
  'discount_supermarket', 'farmers_market', 'flea_market', 'food_store', 'general_store', 'gift_shop',
  'grocery_store', 'health_food_store', 'hypermarket', 'jewelry_store', 'liquor_store', 'market', 'pet_store',
  'shoe_store', 'shopping_mall', 'sporting_goods_store', 'sportswear_store', 'supermarket', 'tea_store',
  'thrift_store', 'toy_store', 'warehouse_store', 'wholesaler', 'womens_clothing_store',
  // Business
  'business_center', 'corporate_office', 'coworking_space', 'farm', 'ranch', 'television_studio',
]);

/**
 * Places types that must NEVER be blocked (same sign-off): the generic umbrellas, the live trade types (general_contractor
 * is legacy, missing from current Table A, but returned live for handymen and gardeners, so it is hard-coded here) and
 * the trade-adjacent types in-scope owners carry. launchTrades.test.ts asserts it never meets PLACES_PRIMARY_TYPE_BLOCK.
 */
export const PLACES_MUST_PASS: ReadonlySet<string> = new Set([
  'service', 'store', 'point_of_interest', 'establishment', 'premise', 'food', 'health', 'general_contractor',
  'educational_institution', 'plumber', 'electrician', 'locksmith', 'painter', 'moving_company',
  'roofing_contractor', 'laundry', 'storage', 'shipping_service', 'courier_service', 'transportation_service',
  'manufacturer', 'supplier', 'electronics_store', 'home_goods_store', 'hardware_store', 'home_improvement_store',
  'building_materials_store', 'furniture_store', 'garden_center', 'art_studio',
]);

const TYPE_ID = /^[a-z][a-z0-9_]{1,80}$/;

/** A Places type id or a gcid -> the gcid, or null for anything malformed. */
export function toGbpCategoryId(placesTypeOrGcid: string | null | undefined): string | null {
  if (typeof placesTypeOrGcid !== 'string') return null;
  const value = placesTypeOrGcid.trim().toLowerCase();
  const bare = value.startsWith('gcid:') ? value.slice(5) : value;
  if (!TYPE_ID.test(bare)) return null;
  return PLACES_TYPE_ALIASES[bare] ?? `gcid:${bare}`;
}

/**
 * The primary category of a picked GBP: its Places primaryType, or (audit records written before primaryType was kept)
 * the first non-generic entry of `types`, which Places lists primary-first. Null when neither says anything.
 */
export function primaryCategoryId(candidate: { primaryType?: string; types?: readonly string[] }): string | null {
  const primary = toGbpCategoryId(candidate.primaryType);
  if (primary) return primary;
  for (const type of candidate.types ?? []) {
    if (typeof type !== 'string' || GENERIC_PLACES_TYPES.has(type)) continue;
    const id = toGbpCategoryId(type);
    if (id) return id;
  }
  return null;
}

export function launchTradeGroup(categoryId: string | null | undefined): LaunchTradeGroup | null {
  if (typeof categoryId !== 'string') return null;
  return Object.hasOwn(LAUNCH_TRADE_CATEGORIES, categoryId)
    ? LAUNCH_TRADE_CATEGORIES[categoryId as LaunchTradeCategoryId]
    : null;
}

export function isLaunchTrade(categoryId: string | null | undefined): boolean {
  return launchTradeGroup(categoryId) !== null;
}
