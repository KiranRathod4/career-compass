import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/aptitude")({ component: () => <StubPage title="Aptitude" description="Quant, logical, verbal practice log with topic mastery." /> });
