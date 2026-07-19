import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/games/live")({
  component: LiveCasinoLayout,
});

function LiveCasinoLayout() {
  return <Outlet />;
}
