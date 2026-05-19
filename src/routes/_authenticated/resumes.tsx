import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/resumes")({ component: () => <StubPage title="Resume Vault" description="Versioned resumes and tailored variants." /> });
