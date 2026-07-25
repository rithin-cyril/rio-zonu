import { defineTool } from "@lovable.dev/mcp-js";

const WEDDING_ISO = "2026-10-18T10:30:00+05:30";

export default defineTool({
  name: "get_countdown",
  title: "Get wedding countdown",
  description: "Return days, hours, and minutes remaining until Rithin & Harshita's wedding ceremony.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: () => {
    const target = new Date(WEDDING_ISO).getTime();
    const now = Date.now();
    const diff = Math.max(0, target - now);
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const payload = {
      weddingAt: WEDDING_ISO,
      hasPassed: diff === 0,
      days,
      hours,
      minutes,
    };
    return {
      content: [
        {
          type: "text",
          text: diff === 0
            ? "The wedding day has arrived."
            : `${days} days, ${hours} hours, ${minutes} minutes until the ceremony.`,
        },
      ],
      structuredContent: payload,
    };
  },
});