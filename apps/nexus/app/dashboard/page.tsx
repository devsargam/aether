import { eq } from "drizzle-orm";
import { PlusIcon } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../db";
import { project } from "../../db/schema";
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

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: {
      Cookie: (await headers()).get("Cookie")?.toString() ?? "",
    },
  });

  if (!session) return redirect("/");

  const userProjects = await db.query.project.findMany({
    where: eq(project.userId, session.user.id),
    orderBy: (project, { desc }) => [desc(project.createdAt)],
  });

  function getStatusBadge(status: string) {
    switch (status) {
      case "deployed":
        return (
          <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-xs">
            Deployed
          </span>
        );
      case "building":
        return (
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs">
            Building
          </span>
        );
      case "failed":
        return (
          <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-xs">
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded text-xs">
            Pending
          </span>
        );
    }
  }

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
          {userProjects.length > 0 ? (
            userProjects.map((proj) => (
              <Card key={proj.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{proj.name}</CardTitle>
                    {getStatusBadge(proj.status)}
                  </div>
                  <CardDescription>
                    {proj.deploymentUrl ? (
                      <a
                        href={proj.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {proj.deploymentUrl}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        Deployment pending...
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Repository:
                    </span>
                    <a
                      href={`https://github.com/${proj.repositoryFullName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline truncate"
                    >
                      {proj.repositoryFullName}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Branch:
                    </span>
                    <span className="text-sm text-foreground">
                      {proj.defaultBranch}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center gap-4 py-12">
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
