import { Queue, QueueEvents } from "bullmq";
import { JOB_NAMES, QUEUE_NAME } from "@aether/common";
import { connection, githubApp } from "./config";

export const queue = new Queue(QUEUE_NAME, { connection });
export const queueEvents = new QueueEvents(QUEUE_NAME, { connection });

export function setupQueueHandlers() {
  queueEvents.on("completed", async ({ jobId, returnvalue }) => {
    console.log(`Job ${jobId} completed with result:`, returnvalue);

    try {
      const result = returnvalue as any;

      if (result.success && result.proxyUrl) {
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

        console.log({
          commentId,
          appId,
        });
        console.log("--------------------------------");
        console.log("--------------------------------");
        console.log("--------------------------------");
        console.log("--------------------------------");
        console.log("--------------------------------");
        console.log("--------------------------------");
        console.log("--------------------------------");
        console.log("--------------------------------");

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
      } else if (result.success) {
        // Fallback for jobs that complete but don't have a proxyUrl
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
      } else if (!result.success && result.error) {
        // Handle failures
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
      if (jobData?.owner && jobData?.repoName && jobData?.prNumber) {
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
