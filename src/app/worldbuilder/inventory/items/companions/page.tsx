import { redirect } from "next/navigation";

export default function InventoryCompanionsPage() {
  const params = new URLSearchParams({
    realm: "world_builder",
    tool: "inventory_companions",
    back: "/worldbuilder/inventory",
  });

  redirect(`/coming-soon?${params.toString()}`);
}
