import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_wedding_details",
  title: "Get wedding details",
  description: "Return the couple, wedding date, and location for Rithin & Harshita's wedding.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const details = {
      couple: "Rithin Cyril & V. Harshita",
      date: "Sunday, October 18th, 2026",
      location: "South Coorg, Karnataka, India",
      website: "https://www.tietheknot2026.com",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(details, null, 2) }],
      structuredContent: details,
    };
  },
});