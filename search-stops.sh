#!/usr/bin/env bash
#
# Search for public transport stops by name and get NSR:StopPlace IDs.
#
# Use these IDs in the Journey Planner API (e.g. entur-curls.sh) for
# trip planning, departure boards, etc.
#
# Docs:
#   Geocoder:   https://developer.entur.org/pages-geocoder-intro
#   Geocoder API: https://developer.entur.org/pages-geocoder-api
#   NSR (stops): https://developer.entur.org/pages-nsr-nsr
#   Browse stops: https://stoppested.entur.org
#
# Required header: ET-Client-Name (see https://developer.entur.org/pages-journeyplanner-journeyplanner)
#

GEOCODER="https://api.entur.io/geocoder/v1/autocomplete"
HEADER="ET-Client-Name: openclaw-entur-test"

# Optional: first argument is search text (default "Oslo S")
TEXT="${1:-Oslo S}"
SIZE="${2:-10}"

echo "Searching stops for: $TEXT (max $SIZE results)"
echo "---"

curl -s -G "$GEOCODER" \
  --data-urlencode "text=$TEXT" \
  --data-urlencode "lang=en" \
  --data-urlencode "size=$SIZE" \
  -H "$HEADER" | jq '.features[] | { name: .properties.label, id: .properties.id, layer: .properties.layer }'
