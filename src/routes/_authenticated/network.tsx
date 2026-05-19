import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/network")({ component: () => <StubPage title="Network" description="Recruiters, mentors and referrals contact log." /> });
