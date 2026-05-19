import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/review")({ component: () => <StubPage title="Weekly Review" description="End-of-week reflection, wins, blockers, next focus." /> });
