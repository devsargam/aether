import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { request as httpRequest } from "node:http";

const PROXY_PORT = Number(process.env.PROXY_PORT) || 8080;
const PROXY_DOMAIN = process.env.PROXY_DOMAIN || "localhost";
const USE_HTTPS = process.env.USE_HTTPS === "true";

// Map of app IDs to their ports
const appPortMap = new Map<string, number>();

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
  "Access-Control-Allow-Credentials": "true",
};

function proxyRequest(
  req: IncomingMessage,
  res: ServerResponse,
  targetPort: number
) {
  const options = {
    hostname: "localhost",
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = httpRequest(options, (proxyRes) => {
    // Merge CORS headers with proxied response headers
    const headers = { ...proxyRes.headers, ...corsHeaders };

    // Remove hop-by-hop headers that shouldn't be forwarded
    delete headers['transfer-encoding'];
    delete headers['connection'];
    delete headers['keep-alive'];
    delete headers['upgrade'];

    res.writeHead(proxyRes.statusCode || 500, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error(`Proxy error for port ${targetPort}:`, err.message);
    res.writeHead(502, corsHeaders);
    res.end("Bad Gateway - Unable to reach application");
  });

  req.pipe(proxyReq);
}

const server = createServer((req, res) => {
  const url = req.url || "/";

  // Handle OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Health check endpoint
  if (url === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      ...corsHeaders
    });
    res.end(
      JSON.stringify({
        status: "ok",
        domain: PROXY_DOMAIN,
        activeApps: appPortMap.size,
        apps: Array.from(appPortMap.entries()).map(([id, port]) => ({
          id,
          port,
          subdomain: PROXY_DOMAIN === "localhost"
            ? `${id}.localhost:${PROXY_PORT}`
            : `${id}.${PROXY_DOMAIN}`,
        })),
      })
    );
    return;
  }

  // Extract subdomain from Host header
  const hostHeader = req.headers.host || "";
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;

  // Parse subdomain: <appId>.localhost:8080 or <appId>.shipit.studio
  const domainPattern = PROXY_DOMAIN.replace(/\./g, "\\.");
  const subdomainMatch = host.match(new RegExp(`^([^.]+)\\.${domainPattern}`));

  if (!subdomainMatch) {
    // No subdomain, show app list
    const protocol = USE_HTTPS ? "https" : "http";
    const baseUrl = PROXY_DOMAIN === "localhost"
      ? `${protocol}://localhost:${PROXY_PORT}`
      : `${protocol}://${PROXY_DOMAIN}`;

    res.writeHead(200, {
      "Content-Type": "text/html",
      ...corsHeaders
    });
    res.end(`
      <html>
        <head>
          <title>Aether Reverse Proxy</title>
          <style>
            body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
            h1 { color: #333; }
            .app-card {
              border: 1px solid #ddd;
              padding: 15px;
              margin: 10px 0;
              border-radius: 8px;
              background: #f9f9f9;
            }
            .app-link {
              color: #0070f3;
              text-decoration: none;
              font-weight: bold;
              font-size: 18px;
            }
            .app-link:hover { text-decoration: underline; }
            .app-info { color: #666; margin-top: 5px; }
            code {
              background: #eee;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <h1>Aether Reverse Proxy</h1>
          <p>Active deployments: <strong>${appPortMap.size}</strong></p>
          <p>Access apps using subdomains: <code>&lt;appId&gt;.${PROXY_DOMAIN}</code></p>

          ${
            appPortMap.size === 0
              ? '<p style="color: #999; font-style: italic;">No apps running. Deploy a PR to see it here!</p>'
              : `
          <div>
            ${Array.from(appPortMap.entries())
              .map(
                ([id, port]) => {
                  const appUrl = PROXY_DOMAIN === "localhost"
                    ? `${protocol}://${id}.localhost:${PROXY_PORT}`
                    : `${protocol}://${id}.${PROXY_DOMAIN}`;
                  return `
              <div class="app-card">
                <a class="app-link" href="${appUrl}" target="_blank">
                  ${id}
                </a>
                <div class="app-info">
                  <span>Port: ${port}</span> •
                  <span>URL: <code>${appUrl}</code></span>
                </div>
              </div>
            `;
                }
              )
              .join("")}
          </div>
          `
          }
        </body>
      </html>
    `);
    return;
  }

  const appId = subdomainMatch[1];
  const targetPort = appPortMap.get(appId);

  if (!targetPort) {
    const protocol = USE_HTTPS ? "https" : "http";
    const dashboardUrl = PROXY_DOMAIN === "localhost"
      ? `${protocol}://localhost:${PROXY_PORT}`
      : `${protocol}://${PROXY_DOMAIN}`;

    res.writeHead(404, {
      "Content-Type": "text/html",
      ...corsHeaders
    });
    res.end(`
      <html>
        <body style="font-family: system-ui; max-width: 600px; margin: 100px auto; text-align: center;">
          <h1>404 - App Not Found</h1>
          <p>No deployment found for: <code>${appId}</code></p>
          <p><a href="${dashboardUrl}">View active deployments</a></p>
        </body>
      </html>
    `);
    return;
  }

  // Proxy the request to the target port
  proxyRequest(req, res, targetPort);
});

export function startProxyServer(): void {
  server.listen(PROXY_PORT, () => {
    const protocol = USE_HTTPS ? "https" : "http";
    const dashboardUrl = PROXY_DOMAIN === "localhost"
      ? `${protocol}://localhost:${PROXY_PORT}`
      : `${protocol}://${PROXY_DOMAIN}`;
    const appsPattern = PROXY_DOMAIN === "localhost"
      ? `${protocol}://<appId>.localhost:${PROXY_PORT}`
      : `${protocol}://<appId>.${PROXY_DOMAIN}`;

    console.log(`Reverse proxy server listening on port ${PROXY_PORT}`);
    console.log(`   Domain: ${PROXY_DOMAIN}`);
    console.log(`   Dashboard: ${dashboardUrl}`);
    console.log(`   Apps: ${appsPattern}`);
  });
}

export function registerApp(appId: string, port: number): string {
  appPortMap.set(appId, port);
  const protocol = USE_HTTPS ? "https" : "http";
  const proxyUrl = PROXY_DOMAIN === "localhost"
    ? `${protocol}://${appId}.localhost:${PROXY_PORT}`
    : `${protocol}://${appId}.${PROXY_DOMAIN}`;

  console.log(`Registered app "${appId}" → port ${port}`);
  console.log(`   Accessible at: ${proxyUrl}`);
  return proxyUrl;
}

export function unregisterApp(appId: string): void {
  const port = appPortMap.get(appId);
  appPortMap.delete(appId);
  if (port) {
    console.log(`Unregistered app "${appId}" from port ${port}`);
  }
}

export function getRegisteredApps(): Map<string, number> {
  return new Map(appPortMap);
}
