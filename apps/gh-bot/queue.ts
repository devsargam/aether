import { QUEUE_NAME } from "@aether/common";
import { Queue, QueueEvents } from "bullmq";
import { sql } from "drizzle-orm";
import { connection, githubApp } from "./config";
import { db } from "./db";

export const queue = new Queue(QUEUE_NAME, { connection });
export const queueEvents = new QueueEvents(QUEUE_NAME, { connection });

export function setupQueueHandlers() {
  queueEvents.on("completed", async ({ jobId, returnvalue }) => {
    console.log(`Job ${jobId} completed with result:`, returnvalue);

    try {
      const result = returnvalue as any;

      // Update database if projectId and deploymentId are present
      if (result.projectId && result.deploymentId) {
        if (result.success && result.proxyUrl) {
          // Update project status to deployed
          await db.execute(
            sql`UPDATE project SET status = 'deployed', deployment_url = ${result.proxyUrl}, last_deployed_at = NOW(), updated_at = NOW() WHERE id = ${result.projectId}`
          );

          // Update deployment status to success
          await db.execute(
            sql`UPDATE deployment SET status = 'success', url = ${result.proxyUrl}, completed_at = NOW() WHERE id = ${result.deploymentId}`
          );

          console.log(
            `✅ Updated project ${result.projectId} status to deployed`
          );
        } else if (!result.success && result.error) {
          // Update project status to failed
          await db.execute(
            sql`UPDATE project SET status = 'failed', updated_at = NOW() WHERE id = ${result.projectId}`
          );

          // Update deployment status to failed
          await db.execute(
            sql`UPDATE deployment SET status = 'failed', error = ${result.error}, build_logs = ${result.buildLogs || null}, completed_at = NOW() WHERE id = ${result.deploymentId}`
          );

          console.log(
            `❌ Updated project ${result.projectId} status to failed`
          );
        }
      }

      // Only post GitHub comments if installationId exists (PR deployments)
      if (result.success && result.proxyUrl && result.installationId) {
        const {
          owner,
          repoName,
          prNumber,
          branch,
          proxyUrl,
          appId,
          commentId,
        } = result;
        const octokit = await githubApp.getInstallationOctokit(
          result.installationId
        );

        const commentBody = `**Deployed** → **[${proxyUrl}](${proxyUrl})**

Branch: \`${branch}\` · App ID: \`${appId}\``;

        if (commentId) {
          // Update the existing comment
          await octokit.request(
            "PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}",
            {
              owner,
              repo: repoName,
              comment_id: commentId,
              body: commentBody,
            }
          );
          console.log(`Updated comment on PR #${prNumber}`);
        } else {
          // Fallback: create new comment if no commentId
          await octokit.request(
            "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
            {
              owner,
              repo: repoName,
              issue_number: prNumber,
              body: commentBody,
            }
          );
          console.log(`Posted deployment URL on PR #${prNumber}: ${proxyUrl}`);
        }
      } else if (result.success && result.installationId) {
        // Fallback for jobs that complete but don't have a proxyUrl (only for PR deployments)
        const { owner, repoName, prNumber, branch, commentId } = result;
        const octokit = await githubApp.getInstallationOctokit(
          result.installationId
        );

        const commentBody = `**Processed** \`${branch}\``;

        if (commentId) {
          await octokit.request(
            "PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}",
            {
              owner,
              repo: repoName,
              comment_id: commentId,
              body: commentBody,
            }
          );
          console.log(`Updated comment on PR #${prNumber}`);
        } else {
          await octokit.request(
            "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
            {
              owner,
              repo: repoName,
              issue_number: prNumber,
              body: commentBody,
            }
          );
          console.log(`Posted success comment on PR #${prNumber}`);
        }
      } else if (!result.success && result.error && result.installationId) {
        // Handle failures (only for PR deployments)
        const { owner, repoName, prNumber, error, buildLogs, commentId } =
          result;
        const octokit = await githubApp.getInstallationOctokit(
          result.installationId
        );

        const errorMessage = `**Deployment failed**: ${error}${
          buildLogs
            ? `\n\n<details><summary>Build logs</summary>\n\n\`\`\`\n${buildLogs.slice(-2000)}\n\`\`\`\n</details>`
            : ""
        }`;

        if (commentId) {
          await octokit.request(
            "PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}",
            {
              owner,
              repo: repoName,
              comment_id: commentId,
              body: errorMessage,
            }
          );
          console.log(`Updated comment with failure on PR #${prNumber}`);
        } else {
          await octokit.request(
            "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
            {
              owner,
              repo: repoName,
              issue_number: prNumber,
              body: errorMessage,
            }
          );
          console.log(`Posted failure comment on PR #${prNumber}`);
        }
      }
    } catch (error) {
      console.error("Error handling job completion:", error);
    }
  });

  queueEvents.on("failed", async ({ jobId, failedReason, prev }) => {
    console.error(`Job ${jobId} failed: ${failedReason}`);

    try {
      // Try to update the failure comment if we have the necessary data
      const jobData = (prev as any)?.data;

      // Update database if projectId and deploymentId are present
      if (jobData?.projectId && jobData?.deploymentId) {
        await db.execute(
          sql`UPDATE project SET status = 'failed', updated_at = NOW() WHERE id = ${jobData.projectId}`
        );

        await db.execute(
          sql`UPDATE deployment SET status = 'failed', error = ${failedReason}, completed_at = NOW() WHERE id = ${jobData.deploymentId}`
        );

        console.log(
          `❌ Updated project ${jobData.projectId} status to failed (job failed)`
        );
      }

      if (
        jobData?.owner &&
        jobData?.repoName &&
        jobData?.prNumber &&
        jobData?.installationId
      ) {
        const { owner, repoName, prNumber, installationId, commentId } =
          jobData;
        const octokit = await githubApp.getInstallationOctokit(installationId);

        const errorBody = `**Job failed**: ${failedReason}`;

        if (commentId) {
          await octokit.request(
            "PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}",
            {
              owner,
              repo: repoName,
              comment_id: commentId,
              body: errorBody,
            }
          );
          console.log(`Updated comment with job failure on PR #${prNumber}`);
        } else {
          await octokit.request(
            "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
            {
              owner,
              repo: repoName,
              issue_number: prNumber,
              body: errorBody,
            }
          );
          console.log(`Posted job failure comment on PR #${prNumber}`);
        }
      }
    } catch (error) {
      console.error("Error posting failure comment:", error);
    }
  });
}
