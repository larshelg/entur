/**
 * Entur Journey Planner v3 – trip search between two stops (GraphQL).
 * Uses NSR:StopPlace IDs (from search_stops / Geocoder).
 * Docs: https://developer.entur.org/pages-journeyplanner-journeyplanner
 */

const JOURNEY_PLANNER_URL = "https://api.entur.io/journey-planner/v3/graphql";
const ET_CLIENT_NAME = "openclaw-entur-test";

export type JourneyTransportMode = "train" | "bus" | "both";

export interface JourneyLeg {
  expectedStartTime: string;
  expectedEndTime: string;
  mode: string;
  /** Line code (e.g. "F6") or empty for foot. */
  lineCode?: string;
  /** transportMode from API (e.g. "rail", "bus"). */
  transportMode?: string;
  lineName?: string;
  fromPlaceName?: string;
  toPlaceName?: string;
}

export interface JourneyPattern {
  duration: number;
  startTime: string;
  endTime: string;
  legs: JourneyLeg[];
}

export interface SearchJourneyResult {
  fromPlaceId: string;
  toPlaceId: string;
  tripPatterns: JourneyPattern[];
}

function buildTripQuery(transportMode: JourneyTransportMode, includeDateTime: boolean): string {
  const modesFragment =
    transportMode === "both"
      ? ""
      : `, modes: { transportModes: [{ transportMode: ${transportMode === "train" ? "rail" : "bus"} }] }`;
  const dateTimeFragment = includeDateTime ? ", dateTime: $dateTime, arriveBy: $arriveBy" : "";
  const dateTimeVars = includeDateTime ? ", $dateTime: DateTime, $arriveBy: Boolean" : "";
  return `
    query Trip($from: String!, $to: String!, $num: Int!${dateTimeVars}) {
      trip(from: { place: $from }, to: { place: $to }, numTripPatterns: $num${modesFragment}${dateTimeFragment}) {
        tripPatterns {
          duration
          startTime
          endTime
          legs {
            expectedStartTime
            expectedEndTime
            mode
            line {
              publicCode
              transportMode
              name
            }
            fromPlace { name }
            toPlace { name }
          }
        }
      }
    }
  `;
}

function parseLeg(leg: {
  expectedStartTime?: string;
  expectedEndTime?: string;
  mode?: string;
  line?: { publicCode?: string; transportMode?: string; name?: string } | null;
  fromPlace?: { name?: string } | null;
  toPlace?: { name?: string } | null;
}): JourneyLeg {
  return {
    expectedStartTime: leg.expectedStartTime ?? "",
    expectedEndTime: leg.expectedEndTime ?? "",
    mode: leg.mode ?? "unknown",
    lineCode: leg.line?.publicCode,
    transportMode: leg.line?.transportMode,
    lineName: leg.line?.name ?? undefined,
    fromPlaceName: leg.fromPlace?.name ?? undefined,
    toPlaceName: leg.toPlace?.name ?? undefined,
  };
}

export async function searchJourney(
  fromPlaceId: string,
  toPlaceId: string,
  options: {
    transportMode?: JourneyTransportMode;
    numTripPatterns?: number;
    /** Optional: search for journeys at a specific date/time (future or same day). */
    dateTime?: string;
    /** If true and dateTime set, dateTime is latest arrival; else earliest departure. Default false. */
    arriveBy?: boolean;
  } = {}
): Promise<SearchJourneyResult> {
  const { transportMode = "both", numTripPatterns = 5, dateTime, arriveBy = false } = options;
  const includeDateTime = Boolean(dateTime);
  const query = buildTripQuery(transportMode, includeDateTime);
  const variables: Record<string, unknown> = {
    from: fromPlaceId,
    to: toPlaceId,
    num: Math.min(20, Math.max(1, numTripPatterns)),
  };
  if (includeDateTime && dateTime) {
    variables.dateTime = dateTime;
    variables.arriveBy = arriveBy;
  }
  const res = await fetch(JOURNEY_PLANNER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ET-Client-Name": ET_CLIENT_NAME,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Journey Planner error: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as {
    data?: { trip?: { tripPatterns?: unknown[] } };
    errors?: Array<{ message?: string }>;
  };
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join("; ");
    throw new Error(`Journey Planner GraphQL: ${msg}`);
  }
  const patterns = json.data?.trip?.tripPatterns ?? [];
  const tripPatterns: JourneyPattern[] = patterns.map((p) => {
    const q = p as Record<string, unknown>;
    return {
      duration: (q.duration as number) ?? 0,
      startTime: (q.startTime as string) ?? "",
      endTime: (q.endTime as string) ?? "",
      legs: ((q.legs as unknown[]) ?? []).map((leg) => parseLeg(leg as Parameters<typeof parseLeg>[0])),
    };
  });
  return {
    fromPlaceId,
    toPlaceId,
    tripPatterns,
  };
}
