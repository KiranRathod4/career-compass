import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/analytics")({ component: () => <StubPage title="Analytics" description="Cross-module trends: prep, applications, deep work." /> });
