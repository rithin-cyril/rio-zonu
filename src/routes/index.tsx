import { createFileRoute } from "@tanstack/react-router";
import { WeddingInvitation } from "@/components/wedding/WeddingInvitation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rithin & Harshita Wedding 💍" },
      { name: "description", content: "By God's grace and with the blessings of our families, you are cordially invited to witness the sacred union of Rithin & Harshita as they begin their forever together on October 18, 2026." },
      { property: "og:title", content: "Rithin & Harshita Wedding 💍" },
      { property: "og:description", content: "By God's grace and with the blessings of our families, you are cordially invited to witness the sacred union of Rithin & Harshita as they begin their forever together on October 18, 2026." },
    ],
  }),
  component: Index,
});

function Index() {
  return <WeddingInvitation />;
}
