import { redirect } from "next/navigation";

export default function InventoryArtifactsPage() {
  const params = new URLSearchParams({
    realm: "world_builder",
    tool: "inventory_artifacts",
    back: "/worldbuilder/inventory",
  });

  redirect(`/coming-soon?${params.toString()}`);
}
