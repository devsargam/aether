import { Queue, QueueEvents } from "bullmq";
import { JOB_NAMES, QUEUE_NAME } from "@aether/common";
import { connection, githubApp } from "./config";

export const queue = new Queue(QUEUE_NAME, { connection });
export const queueEvents = new QueueEvents(QUEUE_NAME, { connection });

export function setupQueueHandlers() {
  queueEvents.on("completed", async ({ jobId, returnvalue }) => {
    console.log(`✓ Job ${jobId} completed with result:`, returnvalue);

    try {
      const result = returnvalue as any;

      if (result.success && result.cloneDir) {
        const { owner, repoName, prNumber, branch } = result;
        const octokit = await githubApp.getInstallationOctokit(
          result.installationId
        );

        await octokit.request(
          "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
          {
            owner,
            repo: repoName,
            issue_number: prNumber,
            body: `✅ Repository successfully cloned and ready for analysis!\n\n📂 Branch: \`${branch}\`\n📍 Clone location: \`${result.cloneDir}\`\n🔨 Processing completed by forge service`,
          }
        );

        console.log(`✓ Posted success comment on PR #${prNumber}`);
      }
    } catch (error) {
      console.error("Error handling job completion:", error);
    }
  });

  queueEvents.on("failed", async ({ jobId, failedReason }) => {
    console.error(`✗ Job ${jobId} failed: ${failedReason}`);
  });
}
