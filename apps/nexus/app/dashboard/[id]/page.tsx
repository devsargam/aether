import { eq } from "drizzle-orm";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "../../../db";
import { project } from "../../../db/schema";
import { auth } from "../../auth";
import { Nav } from "../../components/nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

dayjs.extend(relativeTime);

export default async function ProjectIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: {
      Cookie: (await headers()).get("Cookie")?.toString() ?? "",
    },
  });

  if (!session) return redirect("/");

  const projectData = await db.query.project.findFirst({
    where: eq(project.id, id),
  });

  if (!projectData || projectData.userId !== session.user.id) {
    return notFound();
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "deployed":
        return (
          <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-xs flex items-center gap-1">
            <span className="size-1.5 bg-green-500 rounded-full animate-pulse" />
            Deployed
          </span>
        );
      case "cloning":
        return (
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs flex items-center gap-1">
            <span className="size-1.5 bg-blue-500 rounded-full animate-pulse" />
            Cloning
          </span>
        );
      case "detecting":
        return (
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs flex items-center gap-1">
            <span className="size-1.5 bg-blue-500 rounded-full animate-pulse" />
            Detecting
          </span>
        );
      case "allocating":
        return (
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs flex items-center gap-1">
            <span className="size-1.5 bg-blue-500 rounded-full animate-pulse" />
            Allocating
          </span>
        );
      case "building":
        return (
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs flex items-center gap-1">
            <span className="size-1.5 bg-blue-500 rounded-full animate-pulse" />
            Building
          </span>
        );
      case "deploying":
        return (
          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 rounded text-xs flex items-center gap-1">
            <span className="size-1.5 bg-purple-500 rounded-full animate-pulse" />
            Deploying
          </span>
        );
      case "failed":
        return (
          <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-xs flex items-center gap-1">
            <span className="size-1.5 bg-red-500 rounded-full" />
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded text-xs flex items-center gap-1">
            <span className="size-1.5 bg-yellow-500 rounded-full" />
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
        <div className="p-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>{projectData.name}</CardTitle>
                {getStatusBadge(projectData.status)}
              </div>
              <CardDescription>
                {projectData.deploymentUrl ? (
                  <a
                    href={projectData.deploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {projectData.deploymentUrl}
                  </a>
                ) : (
                  <span className="text-muted-foreground">
                    Deployment pending...
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Repository:
                  </span>
                  <a
                    href={`https://github.com/${projectData.repositoryFullName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {projectData.repositoryFullName}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Branch:
                  </span>
                  <span className="text-sm text-foreground">
                    {projectData.defaultBranch}
                  </span>
                </div>
                {projectData.lastDeployedAt && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Last Deployed:
                    </span>
                    <span className="text-sm text-foreground">
                      {dayjs(projectData.lastDeployedAt).fromNow()}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Created:
                  </span>
                  <span className="text-sm text-foreground">
                    {dayjs(projectData.createdAt).fromNow()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Updated:
                  </span>
                  <span className="text-sm text-foreground">
                    {dayjs(projectData.updatedAt).fromNow()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="w-6 h-screen border-x border-r border-r-[color:var(--pattern-fg)] bg-[image:repeating-linear-gradient(315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-[length:10px_10px] bg-fixed" />
    </main>
  );
}
