import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDefaultAdmin, initializeOrderSchema, initializeTrainingSchema } from "./init";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Content Security Policy
app.use((req, res, next) => {
  const isDev = app.get("env") === "development";
  const cspParts = [
    "default-src 'self'",
    // In dev, allow inline scripts for Vite's React Fast Refresh preamble
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'"
      : "script-src 'self'",
    // Allow inline styles from Tailwind and Google Fonts stylesheets
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Allow Google Fonts
    "font-src 'self' https://fonts.gstatic.com",
    // Allow images from self and data/blob URLs
    "img-src 'self' data: blob:",
    // Permit HMR websocket in development
    isDev ? "connect-src 'self' ws:" : "connect-src 'self'",
    // Frames none
    "frame-ancestors 'none'",
  ];
  res.setHeader("Content-Security-Policy", cspParts.join("; "));
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Ensure DB schema before any storage reads, then initialize default admin
  await initializeOrderSchema();
  await initializeTrainingSchema();
  await initializeDefaultAdmin();

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  log('Server restarting with v2 endpoint...');
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
