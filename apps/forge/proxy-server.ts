import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { request as httpRequest } from "node:http";

const PROXY_PORT = Number(process.env.PROXY_PORT) || 8080;

// Map of app IDs to their ports
const appPortMap = new Map<string, number>();

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
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error(`Proxy error for port ${targetPort}:`, err.message);
    res.writeHead(502);
    res.end("Bad Gateway - Unable to reach application");
  });

  req.pipe(proxyReq);
}

const server = createServer((req, res) => {
  const url = req.url || "/";

  // Health check endpoint
  if (url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        activeApps: appPortMap.size,
        apps: Array.from(appPortMap.entries()).map(([id, port]) => ({
          id,
          port,
          subdomain: `${id}.localhost:${PROXY_PORT}`,
        })),
      })
    );
    return;
  }

  // Extract subdomain from Host header
  const hostHeader = req.headers.host || "";
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;

  // Parse subdomain: <appId>.localhost:8080 or <appId>.localhost
  const subdomainMatch = host.match(/^([^.]+)\.localhost/);

  if (!subdomainMatch) {
    // No subdomain, show app list
    res.writeHead(200, { "Content-Type": "text/html" });
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
          <p>Access apps using subdomains: <code>&lt;appId&gt;.localhost:${PROXY_PORT}</code></p>
          
          ${
            appPortMap.size === 0
              ? '<p style="color: #999; font-style: italic;">No apps running. Deploy a PR to see it here!</p>'
              : `
          <div>
            ${Array.from(appPortMap.entries())
              .map(
                ([id, port]) => `
              <div class="app-card">
                <a class="app-link" href="http://${id}.localhost:${PROXY_PORT}" target="_blank">
                  ${id}
                </a>
                <div class="app-info">
                  <span>Port: ${port}</span> • 
                  <span>URL: <code>http://${id}.localhost:${PROXY_PORT}</code></span>
                </div>
              </div>
            `
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
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end(`
      <html>
        <body style="font-family: system-ui; max-width: 600px; margin: 100px auto; text-align: center;">
          <h1>404 - App Not Found</h1>
          <p>No deployment found for: <code>${appId}</code></p>
          <p><a href="http://localhost:${PROXY_PORT}">View active deployments</a></p>
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
    console.log(`Reverse proxy server listening on port ${PROXY_PORT}`);
    console.log(`   Dashboard: http://localhost:${PROXY_PORT}`);
    console.log(`   Apps: http://<appId>.localhost:${PROXY_PORT}`);
  });
}

export function registerApp(appId: string, port: number): string {
  appPortMap.set(appId, port);
  const proxyUrl = `http://${appId}.localhost:${PROXY_PORT}`;
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
