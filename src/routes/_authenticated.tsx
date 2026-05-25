import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { data: profile, isLoading: profileLoading } = useQuery({
    enabled: !!user,
    queryKey: ["profile-onboarding", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("onboarded_at").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || profileLoading) return;
    const needsOnboarding = !profile?.onboarded_at;
    if (needsOnboarding && pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [user, profile, profileLoading, pathname, navigate]);

  if (loading || !user || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Onboarding takes full screen — no sidebar/topbar
  if (pathname === "/onboarding") {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
