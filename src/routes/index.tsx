import { createFileRoute } from "@tanstack/react-router";
import { WeddingInvitation } from "@/components/wedding/WeddingInvitation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rithin and Harshita" },
      { name: "description", content: "Together with our families, we joyfully invite you to celebrate our wedding." },
      { property: "og:title", content: "Rithin and Harshita" },
      { property: "og:description", content: "A royal Tamil wedding celebration. 12 December 2026." },
    ],
  }),
  component: Index,
});

function Index() {
  return <WeddingInvitation />;
}
