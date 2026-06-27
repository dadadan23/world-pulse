# Phase 2 Historical Context: Expansion Candidate Evaluation

Parent story: [#161](https://github.com/dadadan23/world-pulse/issues/161)  
Parent feature: [#156 – Historical Context Data Model and Ingestion Pipeline](https://github.com/dadadan23/world-pulse/issues/156)

## Evaluation Methodology

Each candidate was scored on four dimensions (1–5 scale, 5 = best):

| Dimension | Description |
|---|---|
| **Signal density** | Volume of quality records with precise geo-coordinates and dates |
| **Signal clarity** | How clearly an event maps to a point in time and space |
| **Sensitivity risk** | Potential for distress or misrepresentation (lower = riskier) |
| **Data availability** | Freely licensed, API-accessible, or well-structured public datasets |

Threshold for **go**: signal density ≥ 3, signal clarity ≥ 3, sensitivity risk ≥ 3, data availability ≥ 3.

---

## Candidate 1: Aviation Incidents (Plane Crashes)

### Overview

Major commercial aviation accidents with fatalities, geo-tagged to the crash site.

### Scoring

| Dimension | Score | Notes |
|---|---|---|
| Signal density | 4 | ~1,000+ records from 1920–present with lat/lon in the ASN database |
| Signal clarity | 5 | Single point-in-time, precise GPS-era coordinates; pre-GPS accidents have approximate locations |
| Sensitivity risk | 2 | High — fatal accidents involve recent deaths and grieving families; incidents ≤10 years ago are particularly sensitive |
| Data availability | 4 | Aviation Safety Network (ASN) offers structured data; NTSB accident database is US-only but well-structured and public |

**Composite: 15 / 20**

### Recommendation: **CONDITIONAL GO**

Include only accidents with ≥ 10-year cutoff from current date. Filter out accidents involving <10 fatalities to reduce noise. Require a minimum confidence of 0.7 for display (precise crash-site coordinates only). Cap description display at factual summary only — no casualty counts surfaced in ambient mode.

Apply the `sensitive` category flag so the confidence bar renders before details are shown (existing suppression rule from #163 applies).

### Data sources

- [Aviation Safety Network](https://aviation-safety.net/database/) — structured query interface; requires attribution
- [NTSB Aviation Accident Database](https://www.ntsb.gov/safety/data/Pages/Data_Stats.aspx) — US-centric, public domain

---

## Candidate 2: Expanded Natural Disasters (Beyond Earthquakes)

### Overview

The v1 ingestion covers earthquakes only. This evaluates expanding to volcanic eruptions, tsunamis, major floods, and tropical cyclones.

### Sub-category breakdown

| Sub-category | Signal density | Signal clarity | Sensitivity risk | Data availability | Verdict |
|---|---|---|---|---|---|
| Volcanic eruptions | 4 | 5 | 4 | 5 | **GO** |
| Tsunamis | 3 | 4 | 3 | 4 | **GO** |
| Major floods | 3 | 3 | 3 | 3 | **CONDITIONAL** |
| Tropical cyclones | 4 | 4 | 4 | 4 | **GO** |

### Composite recommendation: **GO** (for eruptions, tsunamis, cyclones; conditional for floods)

**Eruptions:** NOAA/NCEI Significant Volcanic Eruptions database provides lat/lon, VEI, and date. Well-structured, public domain. ~600 records since 1600. Strong signal with clear geographic anchor.

**Tsunamis:** NOAA/NCEI Global Historical Tsunami Database. ~2,400 records with source location. Geo-quality varies for ancient events; filter to confidence level ≥ 3 in source dataset.

**Cyclones:** IBTrACS (International Best Track Archive) from NOAA. Well-maintained, global, lat/lon track points with intensity. Use the landfall point or peak-intensity point as the historical anchor rather than the full track.

**Floods:** EM-DAT (CRED) provides flood data but geocoding is typically at country or province level rather than point-precision. Confidence score would be low for most records. Recommend deferring until a higher-resolution source is available, or mapping to the centroid of the affected region with a large uncertainty radius.

### Data sources

- NOAA NCEI: [Significant Volcanic Eruptions](https://www.ngdc.noaa.gov/hazel/hazard-search/search-criteria?volc=) — public domain
- NOAA NCEI: [Global Tsunami Database](https://www.ngdc.noaa.gov/hazel/hazard-search/search-criteria?tsun=) — public domain
- NOAA IBTrACS: [Cyclone Tracks](https://www.ncei.noaa.gov/products/international-best-track-archive) — public domain
- EM-DAT: [Global Disaster Database](https://www.emdat.be/) — requires registration; non-commercial academic license

---

## Candidate 3: Exploration Events (Space, Polar, Deep Sea)

### Overview

Significant human exploration milestones: rocket launches, lunar/planetary missions, polar expeditions, deep-sea dives, and ocean crossings.

### Sub-category breakdown

| Sub-category | Signal density | Signal clarity | Sensitivity risk | Data availability | Verdict |
|---|---|---|---|---|---|
| Space launches / missions | 4 | 3 | 5 | 4 | **CONDITIONAL GO** |
| Polar expeditions | 2 | 3 | 5 | 3 | **CONDITIONAL** |
| Deep-sea dives / discoveries | 2 | 3 | 5 | 2 | **NO GO** |
| Ocean crossings | 1 | 3 | 5 | 2 | **NO GO** |

### Composite recommendation: **CONDITIONAL GO** (space launches only for v1)

**Space launches:** Launch site is a precise geo-anchor (e.g., Kennedy Space Center, Baikonur). GCAT (Jonathan McDowell's General Catalog) provides machine-readable records for every orbital launch since 1957 — MIT-licensed. ~7,000+ launches. The geo-anchor is the launch pad, not a flight path, which makes display simple and unambiguous.

Display recommendation: show launch pad location for orbital missions. Include mission name, year, outcome (success/failure), and payload type. Do not surface crew fatality events without the 10-year and `sensitive` flag treatments.

**Polar expeditions:** Supply lat/lon for the destination (e.g., South Pole), not the route. Records are sparse (dozens of major expeditions, not hundreds). Low signal density makes it a post-v2 candidate.

**Deep-sea and ocean crossings:** Records are too sparse, geocoding is line-based rather than point-based, and public structured datasets are not mature. Defer indefinitely.

### Data sources

- [GCAT Launch Database](https://planet4589.org/space/gcat/) — Jonathan McDowell; MIT license; machine-readable TSV
- Wikipedia/Wikidata polar expedition lists — sparse; manual curation would be required

---

## Summary

| Candidate | Verdict | Priority |
|---|---|---|
| Aviation incidents | Conditional GO (≥10yr cutoff, sensitive flag) | P2 |
| Volcanic eruptions | GO | P1 |
| Tsunamis | GO | P1 |
| Tropical cyclones | GO | P1 |
| Major floods | Conditional (defer until point-precision source found) | P3 |
| Space launches | Conditional GO (GCAT, launch-site anchor) | P2 |
| Polar expeditions | Defer to post-v2 | P3 |
| Deep-sea / ocean crossings | No GO | — |

### Recommended v1 additions (in order)

1. **Volcanic eruptions** — NOAA NCEI, clean data, low sensitivity, clear geo-anchor
2. **Tsunamis** — NOAA NCEI, pairs naturally with existing earthquake data
3. **Tropical cyclones** — IBTrACS, well-maintained, high public interest

### Deferred to v2

4. Aviation incidents (needs sensitivity guardrail implementation review)
5. Space launches (good data but geo-anchor ambiguity at display needs UX decision)

### Data quality thresholds (apply to all additions)

| Field | Minimum requirement |
|---|---|
| Coordinates | Lat/lon present and within ±90/±180; no country-centroid-only records |
| Date precision | Year known; month/day optional (display adapts to precision) |
| Confidence score | Source dataset confidence ≥ 2 out of source's scale, normalized to 0–1 internal |
| Attribution | Source name and license documented; required for all ingested records |
