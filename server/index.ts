import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage, DatabaseStorage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  // Setup demo data for the database
  if (storage instanceof DatabaseStorage) {
    try {
      await storage.setupDemoData();
      log("Database demo data setup complete");
    } catch (error: any) {
      log(`Error setting up demo data: ${error?.message || 'Unknown error'}`);
    }
  }
  
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

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  const host = '0.0.0.0';
  
  app.set('port', port);
  app.set('host', host);

  try {
    await new Promise((resolve, reject) => {
      server.listen(port, host)
        .once('error', reject)
        .once('listening', () => {
          log(`Server running at http://${host}:${port}`);
          resolve(true);
        });
    });
  } catch (err: any) {
    log(`Failed to start server: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
      log('Port is already in use. Trying to force close...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      try { server.close(); } catch {}
    }
    process.exit(1);
  }

  // Handle process termination
  process.on('SIGTERM', () => {
    log('Received SIGTERM. Shutting down gracefully...');
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });
  });
})();
