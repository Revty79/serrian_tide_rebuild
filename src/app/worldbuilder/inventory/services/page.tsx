import { redirect } from "next/navigation";

export default function InventoryServicesPage() {
  const params = new URLSearchParams({
    realm: "world_builder",
    tool: "inventory_services",
    back: "/worldbuilder/inventory",
  });

  redirect(`/coming-soon?${params.toString()}`);
}
