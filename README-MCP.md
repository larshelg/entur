# Entur MCP Server

Simple MCP server ([mcp-use](https://github.com/mcp-use/mcp-use)) with Entur tools: **search_stops** (find stops by name) and **search_journey** (plan trips between two stops). Uses Entur Geocoder and Journey Planner v3 (Norwegian public transport).

## Run

```bash
npm run build
npm run mcp
```

- **Server:** http://localhost:3000  
- **Inspector (test tools):** http://localhost:3000/inspector  
- **MCP endpoint:** http://localhost:3000/mcp  

## Tool: `search_stops`

- **name** (required): Stop or place name (e.g. `"Oslo S"`, `"Bergen stasjon"`).
- **size** (optional): Max results 1–100 (default 10).
- **transportMode** (optional): `"train"` | `"bus"` | `"both"` – filter by transport type.

Returns a list of matches with `name → NSR:StopPlace:id (layer)` and transport types. Use these IDs with **search_journey** or the Journey Planner API.

## Tool: `search_journey`

Search for journeys between two stops (Entur Journey Planner v3).

- **fromPlaceId** (required): Origin NSR:StopPlace ID (e.g. `NSR:StopPlace:59872` for Oslo S). Use **search_stops** to find IDs.
- **toPlaceId** (required): Destination NSR:StopPlace ID (e.g. `NSR:StopPlace:59983` for Bergen).
- **transportMode** (optional): `"train"` | `"bus"` | `"both"` – filter trips by mode (default: all).
- **numTripPatterns** (optional): Number of trip options 1–20 (default 5).
- **dateTime** (optional): ISO 8601 date/time for when to travel (e.g. `2026-02-17T08:00:00+01:00`). Omit for “now”; supports future dates.
- **arriveBy** (optional): If true and **dateTime** is set, **dateTime** is latest arrival; otherwise earliest departure (default: false).

Returns trip options with departure/arrival times, duration and legs (rail, bus, foot).

## Use with an MCP client

Configure your client (e.g. Claude Desktop, Cursor) to use this server:

**stdio:** Run `node dist/server.js` (mcp-use also supports stdio).  
**SSE:** Use `http://localhost:3000/sse` if the server is running and the client supports SSE.
