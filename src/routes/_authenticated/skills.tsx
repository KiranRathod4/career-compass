import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/skills")({ component: () => <StubPage title="Skill Matrix" description="Self-rated technical and soft skill matrix." /> });
