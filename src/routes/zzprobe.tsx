import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GalleryProbe } from "@/components/wedding/Gallery";

export const Route = createFileRoute("/zzprobe")({
  component: Probe,
});

function Probe() {
  const [n] = useState(6);
  return <GalleryProbe count={n} />;
}
