import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/sprints")({ component: () => <StubPage title="Sprints" description="2-week prep sprints with goals and outcomes." /> });
