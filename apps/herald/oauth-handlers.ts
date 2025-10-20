import { oauthApp } from "./config";

export function setupOAuthHandlers() {
  oauthApp.on("token", async ({ token, octokit }) => {
    console.log(`Token retrieved for ${token}`);
    const { data } = await octokit.request("GET /user");
    console.log(`Token retrieved for ${data.login}`);
  });
}
