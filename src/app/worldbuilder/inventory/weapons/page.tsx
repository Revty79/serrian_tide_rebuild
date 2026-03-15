import { redirect } from "next/navigation";

export default function InventoryWeaponsPage() {
  const params = new URLSearchParams({
    realm: "world_builder",
    tool: "inventory_weapons",
    back: "/worldbuilder/inventory",
  });

  redirect(`/coming-soon?${params.toString()}`);
}
