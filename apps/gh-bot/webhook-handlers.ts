import { JOB_NAMES } from "@aether/common";
import { webhooks, githubApp } from "./config";
import { queue } from "./queue";

async function handlePullRequestOpened(payload: any) {
  const repo = payload.repository.full_name;
  const ref = payload.pull_request.head.ref;
  const installationId = payload.installation!.id;
  const prNumber = payload.pull_request.number;
  const [owner, repoName] = repo.split("/");

  console.log(`PR opened in ${repo} on branch ${ref}`);

  try {
    const octokit = await githubApp.getInstallationOctokit(installationId);
    const { data: installationToken } = await octokit.request(
      "POST /app/installations/{installation_id}/access_tokens",
      {
        installation_id: installationId,
      }
    );

    const job = await queue.add(JOB_NAMES.CLONE_REPOSITORY, {
      token: installationToken.token,
      repo,
      branch: ref,
      prNumber,
      owner,
      repoName,
      installationId,
    });

    console.log(
      `✓ Added clone job to queue for PR #${prNumber} (Job ID: ${job.id})`
    );

    await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner,
        repo: repoName,
        issue_number: prNumber,
        body: `🔄 Repository clone job queued for processing!\n\n📂 Branch: \`${ref}\`\n⏳ Please wait while we prepare your repository for analysis...`,
      }
    );

    console.log(`✓ Posted comment on PR #${prNumber}`);
  } catch (error) {
    console.error(`Failed to queue clone job:`, error);

    try {
      const octokit = await githubApp.getInstallationOctokit(installationId);
      await octokit.request(
        "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
        {
          owner,
          repo: repoName,
          issue_number: prNumber,
          body: `❌ Failed to queue repository clone job.\n\n\`\`\`\n${error}\n\`\`\``,
        }
      );
    } catch (commentError) {
      console.error(`Failed to post error comment:`, commentError);
    }
  }
}

async function handlePullRequestReopened(payload: any) {
  const repo = payload.repository.full_name;
  const ref = payload.pull_request.head.ref;
  const installationId = payload.installation!.id;
  const prNumber = payload.pull_request.number;
  const [owner, repoName] = repo.split("/");

  console.log(`PR reopened in ${repo} on branch ${ref}`);

  try {
    const octokit = await githubApp.getInstallationOctokit(installationId);
    const { data: installationToken } = await octokit.request(
      "POST /app/installations/{installation_id}/access_tokens",
      {
        installation_id: installationId,
      }
    );

    const job = await queue.add(JOB_NAMES.CLONE_REPOSITORY, {
      token: installationToken.token,
      repo,
      branch: ref,
      prNumber,
      owner,
      repoName,
      installationId,
    });

    console.log(
      `✓ Added clone job to queue for PR #${prNumber} (Job ID: ${job.id})`
    );

    await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner,
        repo: repoName,
        issue_number: prNumber,
        body: `🔄 Repository clone job queued for processing!\n\n📂 Branch: \`${ref}\`\n⏳ Please wait while we prepare your repository for analysis...`,
      }
    );

    console.log(`✓ Posted comment on PR #${prNumber}`);
  } catch (error) {
    console.error(`Failed to queue clone job:`, error);

    try {
      const octokit = await githubApp.getInstallationOctokit(installationId);
      await octokit.request(
        "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
        {
          owner,
          repo: repoName,
          issue_number: prNumber,
          body: `❌ Failed to queue repository clone job.\n\n\`\`\`\n${error}\n\`\`\``,
        }
      );
    } catch (commentError) {
      console.error(`Failed to post error comment:`, commentError);
    }
  }
}

export function setupWebhookHandlers() {
  webhooks.on("issues.opened", async ({ payload }) => {
    console.log(`Issue opened: ${payload.issue.title}`);
  });

  webhooks.on("pull_request.opened", async ({ payload }) => {
    console.log(`PR opened: ${payload.pull_request.title}`);
    await handlePullRequestOpened(payload);
  });

  webhooks.on("pull_request.reopened", async ({ payload }) => {
    await handlePullRequestReopened(payload);
  });

  webhooks.on("push", async ({ payload }) => {
    console.log(`Push to ${payload.repository.full_name}`);
  });

  webhooks.on("installation.created", async ({ payload }) => {
    console.log(`Installation created: ${payload.installation.id}`);
  });

  webhooks.on("issue_comment.created", async ({ payload }) => {
    console.log(`Issue comment created: ${payload.comment.body}`);
  });

  webhooks.onAny(async ({ name, payload }) => {
    console.log(`Received webhook event: ${name}`);
  });
}
