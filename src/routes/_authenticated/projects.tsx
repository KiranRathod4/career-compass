import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/projects")({ component: () => <StubPage title="Projects" description="Build log: ideas, in-progress and shipped." /> });
