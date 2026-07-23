import { MobileTopBar } from "@/components/MobileTopBar";
import { Sidebar } from "@/components/Sidebar";
import { SiteFooter } from "@/components/SiteFooter";
import { getFollowedCompetitors } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

/** Persistent product shell for the signed-in app: a left sidebar on desktop,
   a hamburger top bar on mobile, and the page content in the main column.
   Wrap authenticated pages in this instead of the marketing <Nav />. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";
  const following = await getFollowedCompetitors();

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e4e7f0]">
      <div className="flex">
        <Sidebar email={email} followingCount={following.length} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <MobileTopBar email={email} followingCount={following.length} />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
