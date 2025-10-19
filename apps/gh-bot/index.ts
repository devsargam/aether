import { setupQueueHandlers } from "./queue";
import { setupOAuthHandlers } from "./oauth-handlers";
import { setupWebhookHandlers } from "./webhook-handlers";
import { startServer } from "./server";

setupQueueHandlers();
setupOAuthHandlers();
setupWebhookHandlers();
startServer();
