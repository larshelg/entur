#!/usr/bin/env bash
# Entur Journey Planner v3 – simple curl tests
# Journey Planner: https://developer.entur.org/pages-journeyplanner-journeyplanner
# Stop IDs: Geocoder (below) + NSR https://developer.entur.org/pages-nsr-nsr
# Required header: ET-Client-Name: "company-application"

BASE="https://api.entur.io/journey-planner/v3/graphql"
GEOCODER="https://api.entur.io/geocoder/v1/autocomplete"
HEADER="ET-Client-Name: openclaw-entur-test"

# --- Get stop IDs (Geocoder API) ---
# Docs: https://developer.entur.org/pages-geocoder-intro
# Returns addresses, POIs and stops; stop IDs are NSR:StopPlace:NNNNN
# Also: https://stoppested.entur.org to browse NSR in the browser

echo "=== 0. Geocoder: search stops by name (get NSR:StopPlace IDs) ==="
curl -s -G "$GEOCODER" \
  --data-urlencode "text=Oslo S" \
  --data-urlencode "lang=en" \
  --data-urlencode "size=5" \
  -H "$HEADER" | jq '.features[] | { name: .properties.label, id: .properties.id, layer: .properties.layer }'

# 1) Minimal: single stop place by ID (Oslo S)
echo "=== 1. StopPlace (Oslo S) ==="
curl -s -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$HEADER" \
  -d '{
    "query": "query { stopPlace(id: \"NSR:StopPlace:58404\") { id name latitude longitude } }"
  }' | jq .

# 2) Departure board at a stop (next departures)
echo -e "\n=== 2. Departure board (Oslo S) ==="
curl -s -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$HEADER" \
  -d '{
    "query": "query { stopPlace(id: \"NSR:StopPlace:58404\") { id name quays { id name publicCode estimatedCalls(numberOfDepartures: 5) { aimedDepartureTime expectedDepartureTime destinationDisplay { frontText } serviceJourney { journeyPattern { line { publicCode transportMode } } } } } } }"
  }' | jq .

# 3) Trip: A to B (walk only – from your footquery)
echo -e "\n=== 3. Trip walk-only (StopPlace 58404 -> 59872) ==="
curl -s -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$HEADER" \
  -d '{
    "query": "query { trip(from: { place: \"NSR:StopPlace:58404\" }, to: { place: \"NSR:StopPlace:59872\" }, modes: { directMode: foot, transportModes: [] }) { tripPatterns { duration legs { expectedStartTime expectedEndTime mode distance } } } }"
  }' | jq .

# 4) Trip: one transit option (default modes)
echo -e "\n=== 4. Trip with transit ==="
curl -s -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$HEADER" \
  -d '{
    "query": "query { trip(from: { place: \"NSR:StopPlace:58404\" }, to: { place: \"NSR:StopPlace:59872\" }) { tripPatterns { duration legs { expectedStartTime expectedEndTime mode line { publicCode transportMode } } } } }"
  }' | jq .

# 5) Oslo S -> Bergen: next trains (rail only)
# Stop IDs: Oslo S = 59872, Bergen stasjon = 59983 (./search-stops.sh "Bergen stasjon")
# transportModes: [{ transportMode: rail }] = train only
echo -e "\n=== 5. Oslo S -> Bergen: next trains (rail only) ==="
curl -s -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -H "$HEADER" \
  -d '{
    "query": "query { trip(from: { place: \"NSR:StopPlace:59872\" }, to: { place: \"NSR:StopPlace:59983\" }, modes: { transportModes: [{ transportMode: rail }] }, numTripPatterns: 5) { tripPatterns { duration startTime endTime legs { expectedStartTime expectedEndTime mode line { publicCode transportMode name } fromPlace { name } toPlace { name } } } } }"
  }' | jq .
