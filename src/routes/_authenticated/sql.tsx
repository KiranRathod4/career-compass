import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";
export const Route = createFileRoute("/_authenticated/sql")({ component: () => <StubPage title="SQL Tracker" description="Query practice, schema notes and platform progress." /> });
