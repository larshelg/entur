---
name: entur-mcp
description: Use the Entur MCP server to search Norwegian public transport stops and plan journeys (train, bus). Use when the user asks about Norwegian transport, train/bus times, trips between Norwegian places, Entur, NSR stops, or journey planning in Norway.
---

# Entur MCP – Norwegian public transport

This project runs an MCP server with two tools: **search_stops** (find stops by name) and **search_journey** (plan trips between two stops). Data is from Entur (Geocoder + Journey Planner v3).

## When to use

- User asks for train or bus times, routes, or journeys in Norway.
- User mentions places like Oslo S, Bergen, Stavanger, Trondheim, or other Norwegian stops.
- User wants to look up stop IDs (NSR:StopPlace) or plan a trip between two stops.

## Server setup

The MCP server must be running before calling tools.

```bash
# From this repo
npm run build
npm run mcp
```

Server: http://localhost:3000  
MCP endpoint: http://localhost:3000/mcp  
Inspector (test UI): http://localhost:3000/inspector  

If the project has **mcporter** config (`config/mcporter.json`), you can also use:

```bash
npx mcporter list entur
npx mcporter call entur.search_stops name="Oslo S"
npx mcporter call entur.search_journey fromPlaceId=NSR:StopPlace:59872 toPlaceId=NSR:StopPlace:59983
```

Ensure the server is started (e.g. in a separate terminal) before using mcporter or any MCP client.

## Tools

### 1. `search_stops`

**Purpose:** Resolve a place or stop name to NSR:StopPlace IDs (and see transport types).

| Parameter       | Required | Description |
|----------------|----------|-------------|
| `name`         | Yes      | Stop or place name (e.g. `"Oslo S"`, `"Bergen stasjon"`). |
| `size`         | No       | Max results 1–100 (default 10). |
| `transportMode`| No       | `"train"` \| `"bus"` \| `"both"` – filter by type. |

**Returns:** Lines like `Place Name → NSR:StopPlace:12345 (layer) [train, bus]`. Use the **id** (e.g. `NSR:StopPlace:59872`) as input to **search_journey**.

**Example use:** User says “trains from Oslo” → call `search_stops` with `name: "Oslo S"`, optionally `transportMode: "train"`. Then use the returned ID(s) in `search_journey`.

### 2. `search_journey`

**Purpose:** Get trip options between two stops (departure/arrival times, duration, legs).

| Parameter         | Required | Description |
|-------------------|----------|-------------|
| `fromPlaceId`     | Yes      | Origin NSR:StopPlace ID (from **search_stops**). |
| `toPlaceId`       | Yes      | Destination NSR:StopPlace ID. |
| `transportMode`   | No       | `"train"` \| `"bus"` \| `"both"` (default: all). |
| `numTripPatterns` | No       | Number of options 1–20 (default 5). |
| `dateTime`        | No       | ISO 8601 (e.g. `2026-02-17T08:00:00+01:00`). Omit = “now”. |
| `arriveBy`        | No       | If true, `dateTime` = latest arrival; else earliest departure. |

**Returns:** Several options with start/end time, duration, and legs (rail, bus, foot) with line codes and place names.

**Example use:** User asks “How do I get from Oslo to Bergen by train tomorrow morning?” → call `search_stops` for “Oslo S” and “Bergen stasjon” to get IDs, then `search_journey` with those IDs, `transportMode: "train"`, and `dateTime` set to tomorrow morning.

## Typical workflow

1. **Resolve names → IDs:** Use `search_stops` for origin and destination (e.g. “Oslo S”, “Bergen stasjon”). Note the `NSR:StopPlace:…` IDs.
2. **Plan journey:** Call `search_journey` with `fromPlaceId` and `toPlaceId`. Add `transportMode`, `dateTime`, or `arriveBy` if the user specified train/bus only or a time.
3. **Present results:** Summarize trip options (departure, arrival, duration, main legs) in natural language.

## IDs and data

- Stop IDs are **NSR:StopPlace** (e.g. `NSR:StopPlace:59872` = Oslo S, `NSR:StopPlace:59983` = Bergen stasjon).
- All data is Norwegian public transport via Entur; times and routes are for Norway only.

For more detail (run commands, mcporter, MCP client setup), see [README-MCP.md](../../README-MCP.md) in the repo root.
