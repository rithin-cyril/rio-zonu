import { defineTool } from "@lovable.dev/mcp-js";

const events = [
  {
    order: 1,
    title: "Holy Matrimony",
    date: "Sunday, October 18th, 2026",
    time: "10:30 AM",
    venue: "CSI Kanthi Church",
    address: "Anandapura, South Coorg, Karnataka",
    map: "https://maps.app.goo.gl/TWTM3PtCATfNpP7PA",
  },
  {
    order: 2,
    title: "Wedding Reception",
    date: "Sunday, October 18th, 2026",
    time: "12:00 Noon onwards",
    venue: "Church Hall",
    address: "Siddapura, South Coorg, Karnataka",
    map: "https://maps.app.goo.gl/MQvLuRsfRmm8VZ8y8",
  },
];

export default defineTool({
  name: "get_events",
  title: "Get wedding events",
  description: "List the ceremonies for Rithin & Harshita's wedding with date, time, venue, and map link.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(events, null, 2) }],
    structuredContent: { events },
  }),
});