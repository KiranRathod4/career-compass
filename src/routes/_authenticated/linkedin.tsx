import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/linkedin")({ component: () => <StubPage title="LinkedIn Planner" description="Content calendar, post ideas and engagement log." /> });
