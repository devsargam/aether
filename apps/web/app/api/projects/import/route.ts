import { JOB_NAMES } from "@aether/common";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { account, deployment, project } from "../../../../db/schema";
import { queue } from "../../../../lib/queue";
import { auth } from "../../../auth";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { repositoryFullName, defaultBranch, name } = body;

    if (!repositoryFullName || !defaultBranch || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user's GitHub account
    const githubAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, session.user.id),
        eq(account.providerId, "github")
      ),
    });

    if (!githubAccount?.accessToken) {
      return NextResponse.json(
        { error: "GitHub not connected" },
        { status: 400 }
      );
    }

    // Create project
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await db.insert(project).values({
      id: projectId,
      userId: session.user.id,
      name,
      repositoryFullName,
      defaultBranch,
      status: "pending",
    });

    // Create deployment record
    const deploymentId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await db.insert(deployment).values({
      id: deploymentId,
      projectId,
      branch: defaultBranch,
      status: "pending",
    });

    // Parse repo owner and name
    const [owner, repoName] = repositoryFullName.split("/");

    // Add job to queue
    await queue.add(JOB_NAMES.CLONE_REPOSITORY, {
      token: githubAccount.accessToken,
      repo: repositoryFullName,
      branch: defaultBranch,
      owner,
      repoName,
      projectId,
      deploymentId,
      // For initial import, we don't have PR-specific data
      prNumber: 0,
      commentId: null,
      installationId: null,
    });

    return NextResponse.json({
      success: true,
      projectId,
      deploymentId,
    });
  } catch (error) {
    console.error("Error importing project:", error);
    return NextResponse.json(
      { error: "Failed to import project" },
      { status: 500 }
    );
  }
}
