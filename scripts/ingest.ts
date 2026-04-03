#!/usr/bin/env tsx

/**
 * Ingestion script for UK Organic & Regenerative MCP.
 *
 * Seeds the SQLite database with organic standards, permitted inputs,
 * conversion rules, cover crop data, biodiversity guidance, and soil
 * health indicators. All data sourced from public UK/EU sources.
 */

import { createDatabase } from '../src/db.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const db = createDatabase(join(DATA_DIR, 'database.db'));

// Clear existing data
db.run('DELETE FROM organic_standards');
db.run('DELETE FROM permitted_inputs');
db.run('DELETE FROM conversion_rules');
db.run('DELETE FROM cover_crops');
db.run('DELETE FROM biodiversity_guidance');
db.run('DELETE FROM soil_health');
db.run('DELETE FROM search_index');

// ── Organic Standards ────────────────────────────────────────────────

const standards: [string, string, string, string, string, number][] = [
  // Soil Association — Arable
  ['Soil Association', 'arable', 'Max 170 kg N/ha from all organic and in-conversion sources', 'nitrogen', 'Reg 2018/848 Annex II Part I 1.9.2', 0],
  ['Soil Association', 'arable', 'Crop rotation required including nitrogen-fixing crops; no short-term leys under 2 years', 'rotation', 'Reg 2018/848 Art 12(1)(b)', 1],
  ['Soil Association', 'arable', '15% of farmed area maintained as ecological focus area', 'biodiversity', 'SA Standard 4.5', 1],
  ['Soil Association', 'arable', 'Organic seed use mandatory; derogation system for non-available varieties', 'inputs', 'Reg 2018/848 Art 12(1)(i)', 0],
  // Soil Association — Dairy
  ['Soil Association', 'dairy', 'Outdoor access mandatory, minimum 200 days per year', 'welfare', 'SA Standard 11.4', 1],
  ['Soil Association', 'dairy', 'Max 4,000 litres output before concentrate feed ratio restriction applies', 'feed', 'SA Standard 11.6', 1],
  ['Soil Association', 'dairy', 'Minimum 60% forage in daily diet (dry matter basis)', 'feed', 'Reg 2018/848 Annex II Part II 1.4.1', 0],
  // Soil Association — Beef/Sheep
  ['Soil Association', 'beef_sheep', 'Continuous outdoor access required; housing only in adverse conditions', 'welfare', 'SA Standard 12.3', 1],
  ['Soil Association', 'beef_sheep', '100% organic feed required; no GMO feed at any level', 'feed', 'Reg 2018/848 Art 14(1)(d)', 0],
  ['Soil Association', 'beef_sheep', 'Prophylactic antibiotic use banned; max 3 courses allopathic treatment per year', 'health', 'Reg 2018/848 Art 14(1)(e)', 0],
  // Soil Association — Poultry
  ['Soil Association', 'poultry', 'Max 2,000 birds per house for layers; max 1,000 for table birds', 'housing', 'SA Standard 13.2', 1],
  ['Soil Association', 'poultry', 'Outdoor access from 6 weeks of age with minimum 4 m2 per bird', 'welfare', 'Reg 2018/848 Annex II Part II 1.7.1', 0],
  // Soil Association — Horticulture
  ['Soil Association', 'horticulture', 'No heated propagation from fossil fuels (SA-specific restriction)', 'energy', 'SA Standard 6.1', 1],
  ['Soil Association', 'horticulture', 'Peat use banned from 2025 in all growing media', 'inputs', 'SA Standard 6.3', 1],
  // Processing
  ['Soil Association', 'processing', '95% organic ingredients required for organic label', 'labelling', 'Reg 2018/848 Art 30(2)', 0],
  ['Soil Association', 'processing', '70% organic ingredients required for made with organic label', 'labelling', 'Reg 2018/848 Art 30(5)', 0],
  // OF&G — aligned with EU baseline
  ['OF&G', 'arable', 'Crop rotation with nitrogen-fixing crops per EU minimum requirements', 'rotation', 'Reg 2018/848 Art 12(1)(b)', 0],
  ['OF&G', 'arable', 'Same nitrogen limits as EU regulation: max 170 kg N/ha', 'nitrogen', 'Reg 2018/848 Annex II Part I 1.9.2', 0],
  // EU Baseline
  ['EU Baseline', 'arable', 'No GMOs, no synthetic pesticides, no manufactured nitrogen fertiliser', 'general', 'Reg 2018/848 Art 5(f)', 0],
  ['EU Baseline', 'arable', 'Full input/output records required; mass balance documentation', 'records', 'Reg 2018/848 Art 39', 0],
  ['EU Baseline', 'arable', 'Annual inspection by approved control body required', 'inspection', 'Reg 2018/848 Art 34', 0],

  // ── New: Seed & Propagation ───────────────────────────────────────────
  ['EU Baseline', 'arable', 'Organic seed must be used; derogation via OrganicXseeds database when organic seed not available', 'seed', 'Reg 2018/848 Art 12(1)(i)', 0],
  ['EU Baseline', 'arable', 'No chemical seed treatments permitted; no GMO seed or propagation material', 'seed', 'Reg 2018/848 Art 5(f)(iii)', 0],
  ['Soil Association', 'arable', 'Seed derogation requires documented search on OrganicXseeds and written justification to certifier', 'seed', 'SA Standard 4.2', 1],

  // ── New: Weed Management ──────────────────────────────────────────────
  ['EU Baseline', 'arable', 'No synthetic herbicides permitted; weed control by mechanical cultivation, hand weeding, stale seedbeds, flame weeding, and crop competition', 'weed_management', 'Reg 2018/848 Art 12(1)(a)', 0],
  ['Soil Association', 'arable', 'Weed management plan required; emphasis on preventive methods (rotation, cover crops, competitive crop varieties) before curative interventions', 'weed_management', 'SA Standard 4.8', 1],

  // ── New: Record Keeping (detailed) ────────────────────────────────────
  ['EU Baseline', 'arable', 'Full input/output mass balance records per plot; field-level records of all inputs, operations, and yields', 'records', 'Reg 2018/848 Art 39(1)(d)', 0],
  ['EU Baseline', 'beef_sheep', 'Livestock movement records, feed records per batch, and veterinary treatment records with double withdrawal periods', 'records', 'Reg 2018/848 Art 14(1)(e)(ii)', 0],
  ['Soil Association', 'dairy', 'All veterinary treatments recorded with double statutory withdrawal period applied; prophylactic use banned', 'records', 'SA Standard 11.9', 1],

  // ── New: Parallel Production ──────────────────────────────────────────
  ['EU Baseline', 'arable', 'Parallel production (organic and non-organic of same crop) generally banned; exception only with physical and temporal separation plus additional inspection visits', 'parallel_production', 'Reg 2018/848 Art 9(7)', 0],

  // ── New: Aquaculture ──────────────────────────────────────────────────
  ['Soil Association', 'aquaculture', 'Stocking density limits: salmon max 10 kg/m3, trout max 25 kg/m3; natural feed sources preferred', 'density', 'SA Standard 15.2', 1],
  ['Soil Association', 'aquaculture', 'No synthetic colorants (e.g. canthaxanthin) in feed; natural astaxanthin from algae permitted', 'feed', 'SA Standard 15.5', 1],
  ['EU Baseline', 'aquaculture', 'Organic aquaculture certification available from Soil Association and OF&G in the UK', 'certification', 'Reg 2018/848 Annex II Part III', 0],

  // ── New: Processed Food Standards (detailed) ──────────────────────────
  ['EU Baseline', 'processing', '95% organic ingredients by weight (excluding water and salt) required for "organic" label', 'labelling', 'Reg 2018/848 Art 30(2)', 0],
  ['EU Baseline', 'processing', '70-95% organic ingredients may use "made with organic [ingredient]" labelling', 'labelling', 'Reg 2018/848 Art 30(5)', 0],
  ['EU Baseline', 'processing', 'Most synthetic E-number additives prohibited; restricted permitted list in Annex V; no irradiation; no nano-materials', 'additives', 'Reg 2018/848 Annex V Part D', 0],

  // ── New: Wine/Cider ───────────────────────────────────────────────────
  ['EU Baseline', 'wine', 'Organic grapes or apples required; sulphite limits lower than conventional: 100 mg/l red, 150 mg/l white', 'production', 'Reg 2018/848 Annex II Part VI', 0],
  ['EU Baseline', 'wine', 'No synthetic fining agents; permitted fining: bentonite, casein, egg albumin, isinglass', 'production', 'Reg 2018/848 Annex II Part VI', 0],

  // ── New: Textiles ─────────────────────────────────────────────────────
  ['Soil Association', 'textiles', 'GOTS (Global Organic Textile Standard) required for farm-to-final-product chain; covers fibre, processing, packaging, and labelling', 'certification', 'GOTS Version 7.0', 1],
  ['Soil Association', 'textiles', 'Organic wool processing must use GOTS-certified facilities; cotton must be organic-certified from field to finished product', 'processing', 'GOTS Version 7.0', 1],

  // ── New: Mushroom Production ──────────────────────────────────────────
  ['Soil Association', 'mushroom', 'Substrate must be from organic or permitted materials (straw, wood chip, composted manure); no synthetic pesticides on substrate', 'production', 'SA Standard 6.8', 1],
  ['Soil Association', 'mushroom', 'Specific SA standards for mushroom production; substrate composition and pest management documented', 'certification', 'SA Standard 6.8', 1],

  // ── New: Beekeeping ───────────────────────────────────────────────────
  ['Soil Association', 'beekeeping', 'Organic forage area required within 3 km radius of apiary; area must be organic crops or uncultivated land', 'forage', 'SA Standard 14.2', 1],
  ['Soil Association', 'beekeeping', 'No synthetic treatments for varroa; permitted: oxalic acid, formic acid, thymol. Wax management: replace 20% annually', 'health', 'SA Standard 14.5', 1],

  // ── New: Transition Support ───────────────────────────────────────────
  ['EU Baseline', 'arable', 'DEFRA Organic Conversion Information Service (OCIS) provides free conversion advice; Organic Research Centre and local organic groups offer support', 'transition_support', 'DEFRA guidance', 0],

  // ── New: Regenerative Agriculture Principles ──────────────────────────
  ['Regen Agriculture', 'arable', 'Minimise soil disturbance: no-till or min-till to reduce oxidation of organic matter and preserve soil structure and biology', 'soil_disturbance', 'Regen practice', 0],
  ['Regen Agriculture', 'arable', 'Keep soil covered at all times: cover crops, mulch, or living roots year-round to prevent erosion and nutrient loss', 'soil_cover', 'Regen practice', 0],
  ['Regen Agriculture', 'arable', 'Maximise crop diversity: complex rotations, intercropping, companion planting to break disease cycles and build soil biology', 'diversity', 'Regen practice', 0],
  ['Regen Agriculture', 'arable', 'Integrate livestock: mob grazing, ley-arable integration for nutrient cycling and grassland health improvement', 'livestock_integration', 'Regen practice', 0],
  ['Regen Agriculture', 'arable', 'Keep living roots in soil year-round: maintain mycorrhizal networks and feed soil biology continuously', 'living_roots', 'Regen practice', 0],
];

for (const [body, type, req, cat, ref, additional] of standards) {
  db.run(
    'INSERT INTO organic_standards (certification_body, product_type, requirement, category, eu_regulation_ref, additional_to_eu, jurisdiction) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [body, type, req, cat, ref, additional, 'GB']
  );
}

// ── Permitted Inputs ─────────────────────────────────────────────────

const inputs: [string, string, string, string, string, number][] = [
  // Fertilisers (Annex I)
  ['fertiliser', 'Composted farmyard manure', 'Annex I', 'Must be composted; from organic or conventional non-industrial sources', '170 kg N/ha', 0],
  ['fertiliser', 'Rock phosphate', 'Annex I', 'Naturally derived only; cadmium content must be below threshold', 'No specific limit', 0],
  ['fertiliser', 'Potassium sulphate', 'Annex I', 'Naturally derived only; must not be chemically treated', 'No specific limit', 0],
  ['fertiliser', 'Calcified seaweed', 'Annex I', 'Sustainably harvested source only', 'No specific limit', 0],
  ['fertiliser', 'Wood ash', 'Annex I', 'From untreated timber only; no painted or treated wood', 'No specific limit', 0],
  ['fertiliser', 'Seaweed extracts', 'Annex I', 'Direct application or foliar feed; sustainably harvested', 'No specific limit', 0],
  ['fertiliser', 'Blood meal and bone meal', 'Annex I', 'From organic or non-GMO animals; heat-treated', 'No specific limit', 0],
  // Plant protection (Annex II)
  ['plant_protection', 'Copper compounds', 'Annex II', 'Fungicide use only; limit reduced from 8 kg in 2019', '6 kg Cu/ha/year', 0],
  ['plant_protection', 'Sulphur', 'Annex II', 'Fungicide and acaricide; wettable sulphur formulations', 'No specific limit', 0],
  ['plant_protection', 'Pyrethrin (from chrysanthemum)', 'Annex II', 'Naturally derived insecticide; avoid application near water', 'No specific limit', 0],
  ['plant_protection', 'Neem (azadirachtin)', 'Annex II', 'Insect growth regulator; extracted from neem seed', 'No specific limit', 0],
  ['plant_protection', 'Bacillus thuringiensis (Bt)', 'Annex II', 'Biological insecticide; strain-specific approvals', 'No specific limit', 0],
  ['plant_protection', 'Ferric phosphate', 'Annex II', 'Molluscicide (slug pellets); breaks down to iron and phosphate', 'No specific limit', 0],
  ['plant_protection', 'Spinosad', 'Annex II', 'Insecticide; restricted to specific pest situations; toxic to bees during application', 'No specific limit', 1],
  ['plant_protection', 'Potassium bicarbonate', 'Annex II', 'Fungicide; effective against powdery mildew', 'No specific limit', 0],
  // Feed additives (Annex III)
  ['feed_additive', 'Vitamins A, D, E (synthetic)', 'Annex III', 'Permitted for livestock when dietary needs cannot be met from organic feed', 'As required by species', 0],
  ['feed_additive', 'Trace element minerals', 'Annex III', 'Copper, zinc, selenium, cobalt, iodine, manganese as supplements', 'As required by species', 0],
  ['feed_additive', 'Specified enzymes', 'Annex III', 'Selected enzyme preparations for feed digestibility', 'As per product specification', 0],

  // ── New fertilisers ───────────────────────────────────────────────────
  ['fertiliser', 'Gypsum (calcium sulphate)', 'Annex I', 'Permitted; improves soil structure on heavy clays; natural source only', 'No specific limit', 0],
  ['fertiliser', 'Vinasse (sugar beet by-product)', 'Annex I', 'Permitted; potash and nitrogen source; apply in spring to growing crops', 'No specific limit', 0],
  ['fertiliser', 'Horn and hoof meal', 'Annex I', 'Permitted; slow-release nitrogen at 12-14% N; from non-GMO animal sources', 'No specific limit', 0],
  ['fertiliser', 'Feather meal', 'Annex I', 'Permitted; slow-release nitrogen at 12-13% N; heat-treated poultry feathers', 'No specific limit', 0],
  ['fertiliser', 'Green waste compost (PAS 100)', 'Annex I', 'Permitted if from approved PAS 100 source; heavy metal testing required per batch', 'No specific limit', 0],

  // ── New plant protection ──────────────────────────────────────────────
  ['plant_protection', 'Quassia extract', 'Annex II', 'Permitted; aphid control on soft fruit and brassicas; low toxicity to beneficials', 'No specific limit', 0],
  ['plant_protection', 'Garlic extract', 'Annex II', 'Permitted; repellent effect on aphids and other pests; foliar spray application', 'No specific limit', 0],
  ['plant_protection', 'Soft soap (potassium salts of fatty acids)', 'Annex II', 'Permitted; contact insecticide for aphids and whitefly; breaks down rapidly', 'No specific limit', 0],
  ['plant_protection', 'Paraffin oil', 'Annex II', 'Permitted; winter wash for fruit trees to control scale insects and overwintering aphid eggs', 'No specific limit', 0],
  ['plant_protection', 'Iron sulphate', 'Annex II', 'Permitted as moss control on grassland; also minor trace element supply', 'No specific limit', 0],
  ['plant_protection', 'Pheromone traps', 'Annex II', 'Permitted; monitoring and mass trapping for codling moth and other Lepidoptera; no chemical residue', 'No specific limit', 0],

  // ── New feed inputs ───────────────────────────────────────────────────
  ['feed_additive', 'Minerals (salt, limestone, dicalcium phosphate, magnesium oxide)', 'Annex III', 'Specific permitted mineral list for livestock feed supplementation', 'As required by species', 0],
  ['feed_additive', 'Propionic acid (grain preservation)', 'Annex III', 'Permitted for grain preservation in organic systems; prevents mould growth in stored grain', 'As per product specification', 0],
  ['feed_additive', 'Formic acid (silage preservation)', 'Annex III', 'Permitted for silage preservation in organic systems; improves fermentation and reduces spoilage', 'As per product specification', 0],
];

for (const [type, substance, annex, conditions, rate, derogation] of inputs) {
  db.run(
    'INSERT INTO permitted_inputs (input_type, substance, annex, conditions, max_rate, derogation_available, jurisdiction) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [type, substance, annex, conditions, rate, derogation, 'GB']
  );
}

// ── Conversion Rules ─────────────────────────────────────────────────

const conversions: [string, number, number, string, string, string][] = [
  ['arable', 24, 0,
    'In-conversion produce can be sold as "in-conversion" at lower price',
    'CS organic management payments available in England; Organic Farming Scheme closed to new entrants since 2013',
    'Must be 24 months before sowing of first organic crop'],
  ['permanent_grassland', 24, 1,
    'In-conversion produce can be sold as "in-conversion"',
    'CS organic management payments available',
    'Simultaneous conversion with livestock possible; 24 months for land'],
  ['permanent_crops', 36, 0,
    'In-conversion produce can be sold as "in-conversion"',
    'CS organic management payments available',
    '36 months before first organic harvest (applies to orchards, vineyards, soft fruit)'],
  ['cattle', 12, 1,
    'Animals cannot be sold as organic during conversion period',
    'CS organic management payments available for land',
    '12 months or 3/4 of the animals life, whichever is shorter; simultaneous conversion with land possible'],
  ['sheep_pigs', 6, 1,
    'Animals cannot be sold as organic during conversion period',
    'CS organic management payments available for land',
    '6 months conversion period for sheep and pigs'],
  ['poultry', 10, 0,
    'Birds cannot be sold as organic during conversion; eggs require full 6-week conversion',
    'CS organic management payments available for land',
    '10 weeks conversion period; birds must be from organic sources when available'],
];

for (const [type, months, simul, marketing, support, conditions] of conversions) {
  db.run(
    'INSERT INTO conversion_rules (farm_type, conversion_period_months, simultaneous_allowed, in_conversion_marketing, support_available, conditions, jurisdiction) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [type, months, simul, marketing, support, conditions, 'GB']
  );
}

// ── Cover Crops ──────────────────────────────────────────────────────

const coverCrops: [string, string, string, string, number, number, string, string][] = [
  ['Crimson clover', 'legume', 'Jul-Aug', 'Mow and incorporate', 100, 4.0,
    'Spring cereals, spring beans', 'nitrogen_fixation, pollinator'],
  ['White clover', 'legume', 'Mar-Aug', 'Long-term undersow; graze or mow', 150, 3.0,
    'Grass leys, permanent pasture', 'nitrogen_fixation, grazing'],
  ['Winter vetch', 'legume', 'Aug-Oct', 'Incorporate in spring', 90, 4.5,
    'Spring crops, spring cereals', 'nitrogen_fixation, biomass'],
  ['Phacelia', 'non-legume', 'Apr-Sep', 'Frost-killed', 0, 3.0,
    'Any crop (not brassica-related)', 'pollinator, biomass'],
  ['Mustard', 'brassica', 'Aug-Sep', 'Frost-killed or incorporate', 0, 3.0,
    'Avoid before OSR (clubroot risk)', 'biofumigation, biomass'],
  ['Fodder radish', 'brassica', 'Jul-Sep', 'Frost-killed', 0, 4.0,
    'Spring crops; avoid before OSR', 'compaction_relief, biomass'],
  ['Buckwheat', 'other', 'May-Aug', 'Frost-killed', 0, 2.5,
    'Any crop', 'pollinator, phosphorus_scavenger'],
  ['Grazing rye', 'grass', 'Aug-Oct', 'Graze or incorporate', 0, 6.0,
    'Spring crops, maize', 'weed_suppression, biomass, grazing'],
  ['Westerwolds ryegrass', 'grass', 'Mar-Sep', 'Incorporate or graze', 0, 4.5,
    'Any crop', 'quick_establishment, biomass, grazing'],
  ['Black oats', 'grass', 'Aug-Oct', 'Frost-sensitive; winter-killed in most UK winters', 0, 4.0,
    'Spring crops', 'biomass, weed_suppression'],
  ['Linseed', 'other', 'Mar-May', 'Harvest or incorporate', 0, 2.5,
    'Autumn-sown crops', 'break_crop, biomass'],
  ['3-way mix (vetch + phacelia + oats)', 'mix', 'Aug-Sep', 'Incorporate in spring', 50, 5.0,
    'Spring cereals, spring crops', 'nitrogen_fixation, biomass, diversity'],

  // ── New cover crops ───────────────────────────────────────────────────
  ['Berseem clover (Egyptian clover)', 'legume', 'Apr-Aug', 'Frost-killed or mow and incorporate', 80, 4.0,
    'Spring cereals, spring beans', 'nitrogen_fixation, multi_cut'],
  ['Chicory', 'herb', 'Apr-Aug', 'Perennial (2-3 years); graze or top', 0, 3.0,
    'Herbal ley component, livestock grazing', 'mineral_accumulator, anthelmintic, deep_rooting'],
  ['Plantain', 'herb', 'Mar-Sep', 'Perennial; graze or top', 0, 2.5,
    'Herbal ley component, drought-prone fields', 'drought_tolerance, mineral_rich_forage'],
  ['Sunflower', 'other', 'May-Jun', 'Frost-killed', 0, 4.0,
    'Any crop', 'pollinator, deep_rooting, biomass'],
  ['Tillage radish', 'brassica', 'Jul-Sep', 'Frost-killed; decomposes rapidly', 0, 3.5,
    'Spring crops; avoid before OSR', 'compaction_relief, deep_rooting'],
  ['4-way mix (vetch + crimson clover + phacelia + oats)', 'mix', 'Aug-Sep', 'Incorporate in spring', 70, 5.5,
    'Spring cereals, spring crops', 'nitrogen_fixation, biomass, diversity, pollinator'],
  ['Understory clover (micro-clover/white clover)', 'legume', 'Mar-May (under cereal)', 'Persists post-harvest; graze or mow', 60, 1.5,
    'Establishes under cereal, provides ground cover post-harvest', 'nitrogen_fixation, ground_cover, weed_suppression'],
  ['Stubble turnips', 'brassica', 'Jul-Sep', 'Frost-hardy; graze in autumn/winter', 0, 4.0,
    'Spring crops; livestock grazing option', 'grazing, biomass, fast_establishment'],
  ['Sainfoin', 'legume', 'Mar-May', 'Perennial (10+ year life); cut or graze', 120, 3.5,
    'Chalky soils, long-term ley', 'nitrogen_fixation, pollinator, anthelmintic, deep_rooting'],
  ['Winter oilseed rape (volunteer/cover)', 'brassica', 'Aug-Sep', 'Incorporate in spring or harvest', 0, 4.5,
    'Spring crops; monitor clubroot risk', 'biomass, autumn_ground_cover'],
];

for (const [species, type, window, destruction, nFix, biomass, before, purpose] of coverCrops) {
  db.run(
    'INSERT INTO cover_crops (species, species_type, sowing_window, destruction_method, n_fixation_kg_ha, biomass_t_ha, good_before, purpose, jurisdiction) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [species, type, window, destruction, nFix, biomass, before, purpose, 'GB']
  );
}

// ── Biodiversity Guidance ────────────────────────────────────────────

const biodiversity: [string, string, number, number, number, string][] = [
  ['Wildflower meadow', 'field_margin', 4.0, 4000, 30,
    'CS higher-tier payment available; SFI AB1 enhanced option'],
  ['Hedgerow planting', 'boundary', 2.0, 1250, 30,
    'CS hedgerow creation payment; 10-15 GBP/m planting cost'],
  ['Beetle bank', 'in_field', 1.5, 500, 30,
    'SFI payment AB8; minimal establishment cost per 100m'],
  ['Farm pond creation', 'in_field', 2.5, 5500, 30,
    'CS pond creation payment; 3000-8000 GBP creation cost'],
  ['Species-rich grassland', 'field', 6.0, 3500, 30,
    'CS grassland restoration; typically from conversion of improved grass'],
  ['Woodland edge creation', 'boundary', 3.0, 4500, 30,
    'EWCO grant available; England Woodland Creation Offer'],
  ['In-field tree planting (agroforestry)', 'in_field', 1.0, 2000, 30,
    'SFI agroforestry payment; silvoarable or silvopastoral'],
  ['Buffer strip (6m)', 'field_margin', 2.0, 200, 30,
    'SFI SW3 payment 451 GBP/ha; low establishment cost'],

  // ── New biodiversity features ─────────────────────────────────────────
  ['Skylark plots', 'in_field', 0.0, 50, 30,
    'CS option AB5; 4m x 4m unsown patches in winter cereal (2 per ha); no BNG units but proven conservation benefit for ground-nesting birds'],
  ['Lapwing scrapes', 'in_field', 0.5, 300, 30,
    'CS option AB9; shallow wet depressions in spring crop fields; requires wet conditions in breeding season (Mar-Jun)'],
  ['Barn owl boxes', 'boundary', 0.0, 150, 30,
    'Install on mature trees or buildings, 3m+ height with predator guard; pairs with rough grass margins for hunting habitat'],
  ['Ancient woodland restoration (PAWS)', 'woodland', 5.0, 8000, 30,
    'Plantation on Ancient Woodland Sites: removal of non-native conifers; high BNG value; Forestry Commission grants available'],
  ['Pond restoration', 'in_field', 1.5, 3000, 30,
    'De-silt, remove shade, restore margins; more cost-effective than new creation; approx 1.5 BNG units per restored pond'],
  ['Green bridges / wildlife corridors', 'boundary', 2.5, 3500, 30,
    'Connecting habitats across farm: hedgerow-pond-woodland linkage; landscape-scale BNG contribution; SFI boundary options'],
];

for (const [habitat, feature, bng, cost, years, grant] of biodiversity) {
  db.run(
    'INSERT INTO biodiversity_guidance (habitat_type, farm_feature, bng_units_per_ha, creation_cost_per_ha, management_obligation_years, grant_available, jurisdiction) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [habitat, feature, bng, cost, years, grant, 'GB']
  );
}

// ── Soil Health Indicators ───────────────────────────────────────────

const soilHealth: [string, string, string, string, string, string][] = [
  ['Organic matter', '3-6% (arable), 6-10% (grassland)',
    'Loss on ignition (LOI) or VESS test',
    'Cover crops, FYM application, reduced tillage, crop residue incorporation',
    '5-10 years for measurable change', 'all'],
  ['Earthworm count', '>16 per spade-depth (30x30cm)',
    'OPAL earthworm survey method; count in 30x30x30cm soil block',
    'No-till or min-till, organic matter additions, avoid soil compaction',
    '3-5 years', 'all'],
  ['VESS score', 'Sq1-Sq2 (good to fair structure)',
    'Visual Evaluation of Soil Structure; assess spade-depth slice',
    'Reduced traffic, cover crops, organic matter additions, controlled traffic farming',
    '2-5 years', 'all'],
  ['pH', '6.0-6.5 (arable), 5.8-6.0 (grassland)',
    'Standard soil lab test; sample 0-15cm depth',
    'Lime application to correct acidity; ground limestone or calcium carbonate',
    '6-12 months for pH correction', 'all'],
  ['Bulk density', '<1.4 g/cm3 (clay), <1.6 g/cm3 (sand)',
    'Core sample method; known-volume ring at multiple depths',
    'Subsoiling, bio-drilling cover crops (e.g. fodder radish), controlled traffic farming',
    '1-3 years', 'all'],
  ['Water infiltration', '>20 mm/hour',
    'Ring infiltrometer test; measure time for known volume to infiltrate',
    'Cover crops, worm activity promotion, reduced compaction, organic matter additions',
    '2-5 years', 'all'],
  ['Respiration rate (CO2 burst)', '>100 ppm (Solvita test)',
    'Laboratory incubation; Solvita or Haney test for microbial CO2 release',
    'Organic input applications, diverse cover crops, reduced disturbance',
    '1-3 years for response to management change', 'all'],
  ['Aggregate stability', '>60% water-stable aggregates',
    'Wet sieving test; proportion of aggregates surviving immersion',
    'Mycorrhizal inoculation, reduced tillage, organic matter, diverse rotations',
    '2-5 years', 'all'],

  // ── New soil health indicators ────────────────────────────────────────
  ['Mycorrhizal colonisation', '>30% root colonisation',
    'Root staining and microscopy; sample roots from actively growing crop',
    'Avoid high P inputs (>Olsen P 25), reduce tillage intensity, use mycorrhizal-friendly crops in rotation (avoid brassicas)',
    '2-4 years for recovery after tillage damage', 'all'],
  ['Soil biology (tea bag index)', 'Decomposition rate varies by soil type',
    'Standardised tea bag decomposition test; bury rooibos and green tea bags for 3 months, measure weight loss',
    'Diverse organic inputs, reduced disturbance, maintain soil moisture, diverse cover crop mixes',
    '1-2 years for detectable change', 'all'],
  ['Penetrometer resistance', '<2 MPa at field capacity',
    'Penetrometer measurement at multiple points across field; measure at field capacity moisture for comparable results',
    'Subsoiling at correct depth, bio-drilling cover crops (radish, chicory), controlled traffic farming, avoid trafficking wet soils',
    '1-3 years depending on compaction depth', 'all'],
  ['Available phosphorus (Olsen P)', '16-25 mg/l (Index 2)',
    'Standard Olsen P soil test; sample 0-15 cm depth; 20 cores per field minimum',
    'Manage with organic P inputs (FYM, bone meal, rock phosphate); maintain pH 6.0-6.5 for P availability; avoid over-application above Index 3',
    '1-3 years for P index change', 'all'],
  ['Available potassium', '121-240 mg/l (Index 2-)',
    'Standard soil test; sample 0-15 cm depth; ammonium nitrate extraction',
    'Manage with FYM/compost, K-rich green manures (comfrey, chicory), wood ash; avoid K depletion on light soils',
    '1-2 years for K index change', 'all'],
  ['Soil carbon stock', 'Maintain or increase from baseline; national average 55 t C/ha arable to 30 cm',
    'Measure as tonnes C/ha to 30 cm depth; requires bulk density measurement; lab analysis of total organic carbon',
    'Cover crops, reduced tillage, organic matter additions, permanent pasture conversion; ELM carbon payments emerging',
    '5-20 years for significant stock change', 'all'],
];

for (const [indicator, target, method, practices, timeline, soilType] of soilHealth) {
  db.run(
    'INSERT INTO soil_health (indicator, target_range, measurement_method, management_practices, improvement_timeline, soil_type, jurisdiction) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [indicator, target, method, practices, timeline, soilType, 'GB']
  );
}

// ── FTS5 Search Index ────────────────────────────────────────────────

const searchEntries: [string, string, string][] = [
  // Organic standards
  ['Organic Arable Standards - Soil Association',
    'Organic arable farming under Soil Association requires crop rotation with nitrogen-fixing crops, max 170 kg N/ha, 15% ecological focus area, and organic seed use. No short-term leys under 2 years.',
    'organic_standards'],
  ['Organic Dairy Standards - Soil Association',
    'Organic dairy under Soil Association requires outdoor access for min 200 days/year, max 4000 litres before concentrate ratio applies, and 60% forage in daily diet.',
    'organic_standards'],
  ['Organic Beef and Sheep Standards',
    'Organic beef and sheep require continuous outdoor access, 100% organic feed, and prophylactic antibiotic use is banned. Max 3 courses allopathic treatment per year.',
    'organic_standards'],
  ['Organic Poultry Standards',
    'Organic poultry: max 2000 birds per house (layers), 1000 (table birds). Outdoor access from 6 weeks, min 4 m2 per bird.',
    'organic_standards'],
  ['EU Baseline Organic Rules',
    'EU Regulation 2018/848 retained in UK law: no GMOs, no synthetic pesticides, no manufactured nitrogen fertiliser. Full input/output records and mass balance required. Annual inspection by approved control body.',
    'organic_standards'],
  // Permitted inputs
  ['Copper Limits in Organic Farming',
    'Copper compounds permitted for organic plant protection at max 6 kg Cu/ha/year. Reduced from 8 kg in 2019. Fungicide use only.',
    'permitted_inputs'],
  ['Organic Fertiliser Inputs',
    'Permitted fertilisers include composted farmyard manure (170 kg N/ha max), rock phosphate, potassium sulphate (natural), calcified seaweed, wood ash (untreated timber), seaweed extracts, blood meal and bone meal.',
    'permitted_inputs'],
  ['Organic Plant Protection Inputs',
    'Permitted plant protection: sulphur, pyrethrin, neem (azadirachtin), Bacillus thuringiensis (Bt), ferric phosphate (slug pellets), spinosad (restricted), potassium bicarbonate.',
    'permitted_inputs'],
  // Conversion
  ['Organic Conversion Periods',
    'Arable land: 24 months. Permanent crops (orchards, vines): 36 months. Permanent grassland: 24 months. Cattle: 12 months or 3/4 of life. Sheep and pigs: 6 months. Poultry: 10 weeks.',
    'conversion'],
  ['Organic Conversion Support',
    'CS organic management payments available in England. Organic Farming Scheme closed to new entrants since 2013. In-conversion produce can be sold at lower price.',
    'conversion'],
  // Cover crops
  ['Cover Crops for Nitrogen Fixation',
    'Crimson clover fixes 80-120 kg N/ha, sow Jul-Aug. Winter vetch fixes 60-120 kg N/ha, sow Aug-Oct. White clover fixes 100-200 kg N/ha in long-term leys.',
    'cover_crops'],
  ['Cover Crops for Biomass and Weed Suppression',
    'Grazing rye: 4-8 t/ha biomass, sow Aug-Oct, good blackgrass competitor. Black oats: 3-5 t/ha, frost-sensitive. Westerwolds ryegrass: 3-6 t/ha, quick establishment.',
    'cover_crops'],
  ['Cover Crop Sowing Windows and Destruction',
    'Autumn sowing (Aug-Oct): vetch, rye, black oats, mustard. Spring/summer (Mar-Sep): phacelia, buckwheat, westerwolds. Frost-killed: phacelia, mustard, black oats, buckwheat. Incorporate: vetch, rye, clover.',
    'cover_crops'],
  ['Cover Crop Mixes',
    'Three-way mix of vetch, phacelia, and oats provides balanced nitrogen fixation (50 kg/ha), biomass (5 t/ha), and species diversity. Sow Aug-Sep, incorporate in spring before spring crops.',
    'cover_crops'],
  // Biodiversity
  ['Biodiversity Net Gain - Wildflower Meadow',
    'Wildflower meadow creation: 4.0 BNG units/ha. Creation cost 3000-5000 GBP/ha. 30-year management obligation. CS higher-tier payment and SFI AB1 available.',
    'biodiversity'],
  ['Biodiversity Net Gain - Hedgerows and Boundaries',
    'Hedgerow planting: 2.0 BNG units per 100m. Cost 10-15 GBP/m. Woodland edge: 3.0 BNG units/ha with EWCO grant. Buffer strips: 2.0 BNG units per 100m, SFI SW3 payment.',
    'biodiversity'],
  ['Biodiversity Net Gain - In-field Features',
    'Beetle banks: 1.5 BNG units per 100m, SFI AB8 payment. Farm ponds: 2.5 BNG units each, cost 3000-8000 GBP. Agroforestry: 1.0 BNG units/ha, SFI agroforestry payment.',
    'biodiversity'],
  // Soil health
  ['Soil Health - Organic Matter',
    'Target organic matter 3-6% for arable, 6-10% for grassland. Improve with cover crops, FYM, reduced tillage. Expect 5-10 years for measurable change. Measure by loss on ignition.',
    'soil_health'],
  ['Soil Health - Earthworms and Biological Activity',
    'Target >16 earthworms per 30x30cm spade depth. OPAL survey method. Improve with no-till, organic matter, avoid compaction. 3-5 years. Respiration rate target >100 ppm Solvita.',
    'soil_health'],
  ['Soil Health - Physical Structure',
    'VESS score Sq1-Sq2. Bulk density <1.4 g/cm3 clay, <1.6 g/cm3 sand. Water infiltration >20 mm/hr. Aggregate stability >60%. Improve with reduced traffic, cover crops, subsoiling.',
    'soil_health'],
  ['Soil Health - pH Management',
    'Target pH 6.0-6.5 arable, 5.8-6.0 grassland. Standard lab test at 0-15cm. Correct with lime (ground limestone). Response in 6-12 months. Critical for nutrient availability.',
    'soil_health'],
];

for (const [title, body, topic] of searchEntries) {
  db.run(
    'INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)',
    [title, body, topic, 'GB']
  );
}

// ── Metadata ─────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0];
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_ingest', ?)", [today]);
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('build_date', ?)", [today]);

// ── Coverage JSON ────────────────────────────────────────────────────

const counts = {
  organic_standards: db.get<{ c: number }>('SELECT COUNT(*) as c FROM organic_standards')?.c ?? 0,
  permitted_inputs: db.get<{ c: number }>('SELECT COUNT(*) as c FROM permitted_inputs')?.c ?? 0,
  conversion_rules: db.get<{ c: number }>('SELECT COUNT(*) as c FROM conversion_rules')?.c ?? 0,
  cover_crops: db.get<{ c: number }>('SELECT COUNT(*) as c FROM cover_crops')?.c ?? 0,
  biodiversity_habitats: db.get<{ c: number }>('SELECT COUNT(*) as c FROM biodiversity_guidance')?.c ?? 0,
  soil_health_indicators: db.get<{ c: number }>('SELECT COUNT(*) as c FROM soil_health')?.c ?? 0,
  fts_entries: db.get<{ c: number }>('SELECT COUNT(*) as c FROM search_index')?.c ?? 0,
};

const coverage = {
  mcp_name: 'UK Organic & Regenerative MCP',
  jurisdiction: 'GB',
  build_date: today,
  ...counts,
  source_hash: 'initial',
};

writeFileSync(join(DATA_DIR, 'coverage.json'), JSON.stringify(coverage, null, 2) + '\n');

console.log('Ingestion complete:');
console.log(`  Organic standards: ${counts.organic_standards}`);
console.log(`  Permitted inputs: ${counts.permitted_inputs}`);
console.log(`  Conversion rules: ${counts.conversion_rules}`);
console.log(`  Cover crops: ${counts.cover_crops}`);
console.log(`  Biodiversity habitats: ${counts.biodiversity_habitats}`);
console.log(`  Soil health indicators: ${counts.soil_health_indicators}`);
console.log(`  FTS entries: ${counts.fts_entries}`);

db.close();
