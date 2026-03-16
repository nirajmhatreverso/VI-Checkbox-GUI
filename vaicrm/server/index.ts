import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieParser from "cookie-parser";
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- SECURITY MIDDLEWARE ---

// 1. Set security-related HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"], // Allow inline scripts (needed by Vite in dev)
      "connect-src": ["'self'", "ws:", process.env.SERVER_API_TARGET_URL || ''], // Allow WebSocket for HMR and connection to Java API
      "img-src": ["'self'", "data:", "blob:"],
    },
  },
}));

// 2. Use cookie-parser for session and CSRF
app.use(cookieParser(process.env.CSRF_SECRET));

// 3. JSON body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- LOGGING MIDDLEWARE ---
// (Your existing logging middleware is good, no changes needed here)
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

  // --- ERROR HANDLING MIDDLEWARE ---
  // (Your existing error handler is fine)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Check for CSRF error
    if (err.code === 'EBADCSRFTOKEN') {
      log(`[SECURITY] Invalid CSRF Token: ${err.message}`);
      return res.status(403).json({ status: "ERROR", statusMessage: "Invalid CSRF token." });
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    log(`[ERROR] Status: ${status}, Message: ${message}`);
    
    // In production, don't send back detailed errors
    if (process.env.NODE_ENV === 'production') {
        return res.status(status).json({ statusMessage: "An internal error occurred." });
    }

    res.status(status).json({ statusMessage: message });
  });

  // --- VITE/STATIC SERVING LOGIC ---
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // --- PRODUCTION STATIC & CACHING ---
    // Serve static files with aggressive caching
    const oneYearInMs = 31536000000;
    app.use(express.static(path.join(__dirname, '..', '..', 'dist'), { 
      maxAge: oneYearInMs 
    }));
    // The catch-all to serve index.html must be AFTER all API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
    });
  }

  const port = parseInt(process.env.PORT || '5001', 10);
  server.listen(port, "127.0.0.1", () => {
    log(`✅ Server running on http://127.0.0.1:${port}`);
  });
})();