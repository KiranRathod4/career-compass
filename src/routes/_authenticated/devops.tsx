import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/devops")({ component: () => <StubPage title="DevOps Hub" description="Tools, labs and pipelines tracker." /> });
