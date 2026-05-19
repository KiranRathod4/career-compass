import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/qa")({ component: () => <StubPage title="QA Hub" description="Manual + automation testing study and projects." /> });
