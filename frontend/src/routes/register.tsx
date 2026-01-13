import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — OmniSpace" }] }),
  component: () => null,
});
