/**
 * MCP server with Entur tools (stop search by name).
 * Run: npm run build && npm run mcp
 * Inspector: http://localhost:3000/inspector
 */

import { MCPServer, text } from "mcp-use/server";
import { z } from "zod";
import { searchStops } from "./entur-geocoder.js";
import { searchJourney } from "./entur-journey.js";

const server = new MCPServer({
  name: "entur-mcp",
  version: "1.0.0",
  description: "Entur journey planner and geocoder tools (Norwegian public transport)",
});

server.tool(
  {
    name: "search_stops",
    description:
      "Search for public transport stops by name and get NSR:StopPlace IDs. Optionally filter by train or bus. Use these IDs with the Journey Planner API for trips or departure boards. Covers Norwegian stops (Entur Geocoder).",
    schema: z.object({
      name: z.string().describe("Stop or place name to search for (e.g. 'Oslo S', 'Bergen stasjon')"),
      size: z.number().min(1).max(100).optional().default(10).describe("Max number of results (1–100)"),
      transportMode: z
        .enum(["train", "bus", "both"])
        .optional()
        .describe("Filter by transport type: 'train' (rail only), 'bus' (bus/coach only), 'both' (stops that have train or bus). Omit for all results."),
    }) as any,
  },
  async ({ name, size, transportMode }) => {
    const stops = await searchStops(name, { size, transportMode });
    if (stops.length === 0) {
      const filterNote = transportMode ? ` with transport=${transportMode}` : "";
      return text(`No stops found for "${name}"${filterNote}.`);
    }
    const lines = stops.map((s) => {
      const modes = s.transportTypes.length ? ` [${s.transportTypes.join(", ")}]` : "";
      return `- ${s.name} → ${s.id} (${s.layer})${modes}`;
    });
    const filterNote = transportMode ? ` (filter: ${transportMode})` : "";
    return text(`Stops matching "${name}"${filterNote}:\n${lines.join("\n")}`);
  }
);

server.tool(
  {
    name: "search_journey",
    description:
      "Search for public transport journeys between two stops. Use NSR:StopPlace IDs (from search_stops). Returns trip options with duration, times and legs (train/bus/walk). Optionally filter by train or bus only.",
    schema: z.object({
      fromPlaceId: z
        .string()
        .describe("Origin stop ID, e.g. NSR:StopPlace:59872 (Oslo S). Use search_stops to find IDs."),
      toPlaceId: z
        .string()
        .describe("Destination stop ID, e.g. NSR:StopPlace:59983 (Bergen). Use search_stops to find IDs."),
      transportMode: z
        .enum(["train", "bus", "both"])
        .optional()
        .describe("Filter trips by mode: 'train' (rail only), 'bus' (bus only), 'both' (default, all modes)."),
      numTripPatterns: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(5)
        .describe("Number of trip options to return (1–20, default 5)."),
      dateTime: z
        .string()
        .optional()
        .describe("ISO 8601 date/time for when to travel (e.g. 2026-02-17T08:00:00+01:00). Omit for 'now'. Supports future dates."),
      arriveBy: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true and dateTime is set, dateTime is latest arrival; otherwise earliest departure."),
    }) as any,
  },
  async ({ fromPlaceId, toPlaceId, transportMode, numTripPatterns, dateTime, arriveBy }) => {
    const result = await searchJourney(fromPlaceId, toPlaceId, {
      transportMode,
      numTripPatterns,
      dateTime,
      arriveBy,
    });
    if (result.tripPatterns.length === 0) {
      const modeNote = transportMode ? ` (mode: ${transportMode})` : "";
      return text(`No journeys found from ${fromPlaceId} to ${toPlaceId}${modeNote}.`);
    }
    const lines: string[] = [];
    result.tripPatterns.forEach((pattern, i) => {
      const start = pattern.startTime ? new Date(pattern.startTime).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" }) : "?";
      const end = pattern.endTime ? new Date(pattern.endTime).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" }) : "?";
      const dur = pattern.duration ? `${Math.round(pattern.duration / 60)} min` : "?";
      lines.push(`Option ${i + 1}: ${start} → ${end} (${dur})`);
      pattern.legs.forEach((leg) => {
        const lineInfo = leg.lineCode ? ` ${leg.lineCode}` : "";
        const places = [leg.fromPlaceName, leg.toPlaceName].filter(Boolean).join(" → ");
        lines.push(`  • ${leg.mode}${lineInfo}${places ? `: ${places}` : ""}`);
      });
      lines.push("");
    });
    const modeNote = transportMode ? ` (${transportMode} only)` : "";
    const timeNote = dateTime ? ` ${arriveBy ? "arrive by" : "depart at"} ${dateTime}` : "";
    return text(`Journeys ${result.fromPlaceId} → ${result.toPlaceId}${modeNote}${timeNote}:\n\n${lines.join("\n").trimEnd()}`);
  }
);

const port = Number(process.env.PORT) || 3000;
server.listen(port);
console.log(`Entur MCP server: http://localhost:${port}`);
console.log(`Inspector: http://localhost:${port}/inspector`);
