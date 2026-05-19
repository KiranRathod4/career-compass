import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/interview")({ component: () => <StubPage title="Interview Prep" description="Mock interviews, behavioural stories (STAR), HR Q&A." /> });
