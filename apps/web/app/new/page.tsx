import { Nav } from "../components/nav";
import { Button } from "../components/ui/button";

export default function NewPage() {
  return (
    <main className="max-w-4xl mx-auto flex min-h-screen bg-background text-foreground transition-colors">
      <div className="w-6 h-screen border-x border-r border-r-[color:var(--pattern-fg)] bg-[image:repeating-linear-gradient(315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-[length:10px_10px] bg-fixed" />
      <div className="flex-1">
        <Nav />
        <div className="px-8 py-12">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold mb-3">
              Create a new project
            </h1>
            <p className="text-muted-foreground mb-8">
              Import a repository from GitHub to get started with your
              deployment.
            </p>
            <Button variant="outline" size="lg">
              Import Repository from GitHub
            </Button>
          </div>
        </div>
      </div>
      <div className="w-6 h-screen border-x border-r border-r-[color:var(--pattern-fg)] bg-[image:repeating-linear-gradient(315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-[length:10px_10px] bg-fixed" />
    </main>
  );
}
