# Site Bot: out-of-scope Places primaryType block list (Yonatan, 2026-11-25)

Sign-off on trade scope for `src/lib/site-bot/launchTrades.ts` / `profileEligibility.ts`. Source: Places API (New) Table A, https://developers.google.com/maps/documentation/places/web-service/place-types, fetched 2026-11-25 (no last-updated date shown; includes the 2026-02-12 additions). Evidence: `src/lib/site-bot/fixtures/places-trade-scope-2026-11-25.json`.

## Rules
- The block list applies to **primaryType only**. Secondary `types` never block (they're noisy: cleaners carry `laundry`, movers carry `storage`, photographers carry `electronics_store`, a hair salon carries `educational_institution`).
- The block check runs **before** the display-name and `types` branches. A blocked primaryType is never rescued by them.
- A block returns `out_of_scope` with a non-gcid id (`places:<type>`).
- Any type on neither list still passes. New Google types are not blocked until listed.
- `general_contractor` is legacy (not in current Table A) but returned live for handymen and gardeners: hard-code it as MUST-PASS.
- The display-name branch stays (it can only return in_scope). If it ever returns anything else, remove it.

## BLOCK (primaryType)
Whole Table A sections: Food and Drink; Lodging; Government; Places of Worship; Geographical Areas; Natural Features; Housing; Facilities; Culture (except `art_studio`); Sports; Entertainment and Recreation; Transportation (except `transportation_service`; includes `taxi_service`).
- **Finance:** accounting, atm, bank
- **Automotive:** car_dealer, car_rental, car_repair, car_wash, tire_shop, truck_dealer, gas_station, parking, parking_garage, parking_lot, rest_stop, electric_vehicle_charging_station, ebike_charging_station
- **Health and Wellness:** chiropractor, dental_clinic, dentist, doctor, drugstore, general_hospital, hospital, massage, massage_spa, medical_center, medical_clinic, medical_lab, pharmacy, physiotherapist, sauna, skin_care_clinic, spa, tanning_studio, wellness_center, yoga_studio
- **Education:** school, primary_school, secondary_school, preschool, university, academic_department, research_institute, library
- **Beauty:** beauty_salon, beautician, barber_shop, hair_salon, hair_care, nail_salon, makeup_artist, body_art_service, foot_care
- **Other Services:** lawyer, insurance_agency, real_estate_agency, travel_agency, tour_agency, tourist_information_center, employment_agency, consultant, marketing_consultant, telecommunications_service_provider, funeral_home, cemetery, florist, tailor, catering_service, food_delivery, veterinary_care, pet_care, pet_boarding_service, child_care_agency, summer_camp_organizer, astrologer, psychic, aircraft_rental_service, chauffeur_service, association_or_organization, non_profit_organization
- **Shopping:** asian_grocery_store, auto_parts_store, bicycle_store, book_store, butcher_shop, cell_phone_store, clothing_store, convenience_store, cosmetics_store, department_store, discount_store, discount_supermarket, farmers_market, flea_market, food_store, general_store, gift_shop, grocery_store, health_food_store, hypermarket, jewelry_store, liquor_store, market, pet_store, shoe_store, shopping_mall, sporting_goods_store, sportswear_store, supermarket, tea_store, thrift_store, toy_store, warehouse_store, wholesaler, womens_clothing_store
- **Business:** business_center, corporate_office, coworking_space, farm, ranch, television_studio

Borderline BLOCKs:
- makeup_artist, pet_care and child_care_agency are home-visit work, but not launch trades.
- sports_coaching, sports_school, fitness_center and gym: launch tutoring means academic `tutoring_service` only.
- car_wash: auto is out of scope.
- consultant and marketing_consultant: office or online work.

## MUST-PASS
- **Generic:** service, store, point_of_interest, establishment, premise, food, health (legacy umbrellas never block)
- **Live trade types:** general_contractor, educational_institution, plus the in-scope plumber, electrician, locksmith, painter, moving_company, roofing_contractor
- **Trade adjacency:** laundry (cleaners), storage / shipping_service / courier_service / transportation_service (movers), manufacturer (AC, metal_fabricator), supplier (solar), electronics_store / home_goods_store (photographer, appliance repair, AC), hardware_store / home_improvement_store / building_materials_store (locksmiths, glaziers, kitchens), furniture_store (carpenters), garden_center (gardeners), art_studio (photographers)

## Tests
- One test per fixture probe.
- restaurant / hair_salon / dentist → trade.
- laundry as primaryType → pass.
- beauty_salon as primaryType → trade.

## Follow-up
About a week after launch, Yonatan re-probes 10–15 waitlisted and 10 interviewed businesses, and decides whether hardware_store / electronics_store / laundry move to BLOCK.
