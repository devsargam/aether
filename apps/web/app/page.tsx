import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { Landing } from "./components/landing";
import { Nav } from "./components/nav";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: {
      Cookie: (await headers()).get("Cookie")?.toString() ?? "",
    },
  });

  if (session) return redirect("/dashboard");

  return (
    <main className="max-w-4xl mx-auto flex min-h-screen bg-background text-foreground transition-colors">
      <div className="w-6 h-screen border-x border-r border-r-[color:var(--pattern-fg)] bg-[image:repeating-linear-gradient(315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-[length:10px_10px] bg-fixed" />
      <div className="flex-1">
        <Nav />
        <Landing />
      </div>
      <div className="w-6 h-screen border-x border-r border-r-[color:var(--pattern-fg)] bg-[image:repeating-linear-gradient(315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-[length:10px_10px] bg-fixed" />
    </main>
  );
}
