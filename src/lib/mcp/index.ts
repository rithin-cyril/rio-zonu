import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getWeddingDetails from "./tools/get-wedding-details";
import getEvents from "./tools/get-events";
import getCountdown from "./tools/get-countdown";

// The OAuth issuer must be the direct Supabase host; the project ref is the
// only Supabase value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "rithin-harshita-wedding-mcp",
  title: "Rithin & Harshita Wedding",
  version: "0.1.0",
  instructions:
    "Public tools for Rithin & Harshita's wedding invitation. Use `get_wedding_details` for the couple, date, and location; `get_events` for the ceremony schedule with venues and map links; `get_countdown` for time remaining until the ceremony.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getWeddingDetails, getEvents, getCountdown],
});