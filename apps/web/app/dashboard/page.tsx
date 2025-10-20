import { PlusIcon } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../auth";
import { Nav } from "../components/nav";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";

const fakeProjects = [
  {
    id: 1,
    name: "Aether Blog Engine",
    domain: "blog.aether.dev",
    repoLink: "https://github.com/aether/blog-engine",
    lastCommit: "feat: add markdown support for posts",
  },
  {
    id: 2,
    name: "Quantum Dashboard",
    domain: "dashboard.quantum.io",
    repoLink: "https://github.com/quantum/dashboard",
    lastCommit: "fix: resolve memory leak in data fetching",
  },
  {
    id: 3,
    name: "Neural API Gateway",
    domain: "api.neural.cloud",
    repoLink: "https://github.com/neural/api-gateway",
    lastCommit: "chore: update dependencies to latest versions",
  },
  {
    id: 4,
    name: "Stellar Commerce",
    domain: "shop.stellar.com",
    repoLink: "https://github.com/stellar/commerce",
    lastCommit: "feat: implement payment processing with Stripe",
  },
  {
    id: 5,
    name: "Cosmos Analytics",
    domain: "analytics.cosmos.io",
    repoLink: "https://github.com/cosmos/analytics",
    lastCommit: "refactor: optimize database queries for performance",
  },
  {
    id: 6,
    name: "Phoenix CMS",
    domain: "cms.phoenix.dev",
    repoLink: "https://github.com/phoenix/cms",
    lastCommit: "docs: update API documentation",
  },
];

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: {
      Cookie: (await headers()).get("Cookie")?.toString() ?? "",
    },
  });

  if (!session) return redirect("/");

  return (
    <main className="max-w-4xl mx-auto flex min-h-screen bg-background text-foreground transition-colors">
      <div className="w-6 h-screen border-x border-r border-r-[color:var(--pattern-fg)] bg-[image:repeating-linear-gradient(315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-[length:10px_10px] bg-fixed" />
      <div className="flex-1">
        <Nav />
        <div className="flex items-center gap-2 p-6">
          <Input placeholder="Search..." />
          <Link href="/new">
            <Button variant="outline">
              Add <PlusIcon className="size-4" />
            </Button>
          </Link>
        </div>
        <div className="grid md:grid-cols-2 grid-cols-1 gap-4 p-6 pt-0">
          {fakeProjects.length > 0 ? (
            fakeProjects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>
                    <span className="text-blue-500">{project.domain}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Repository:
                    </span>
                    <a
                      href={project.repoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline truncate"
                    >
                      {project.repoLink}
                    </a>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Last commit:
                    </span>
                    <span className="text-sm text-foreground">
                      {project.lastCommit}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center gap-4">
              <p className="text-muted-foreground">
                You don't have any projects yet.
              </p>
              <Link href="/new">
                <Button variant="outline">Create a new project</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      <div className="w-6 h-screen border-x border-r border-r-[color:var(--pattern-fg)] bg-[image:repeating-linear-gradient(315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-[length:10px_10px] bg-fixed" />
    </main>
  );
}
