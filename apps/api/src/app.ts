import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middleware/error-handler.js";
import { AppError } from "./utils/app-error.js";
import { env } from "./config/env.js";
import routes from "./routes.js";
import { requestLogger } from "./middleware/request-logger.js";
import cookieParser from "cookie-parser";
import { globalLimiter } from "./middleware/rate-limiter.js";

declare module "http" {
    interface IncomingMessage {
        rawBody?: Buffer;
    }
}

declare global {
    namespace Express {
        interface Request {
            rawBody?: Buffer;
        }
    }
}

const app = express();
app.use(requestLogger);

const allowedOrigins = env.corsOrigin.split(",").map((o) => o.trim());

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || env.nodeEnv === "development") {
            callback(null, true);
        } else {
            callback(new Error("CORS request origin rejected"));
        }
    },
    credentials: true,
}));
app.use(express.json({
    verify: (req, _res, buf) => {
        req.rawBody = Buffer.from(buf);
    },
}));
app.use(cookieParser());
app.use(globalLimiter);

app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: "ok",
        },
    });
});
app.use("/api/v1", routes);

// Bull Board UI for queue monitoring (guarded by Super Admin authorization)
if (env.enableQueues) {
    try {
        const { setupBullBoard, bullBoardAuthMiddleware } = await import("./modules/queues/bull-board.js");
        app.use(
            "/api/v1/admin/queues",
            bullBoardAuthMiddleware,
            setupBullBoard()
        );
    } catch (err) {
        // Bull board initialization error handled gracefully
    }
}

// 404 Catch-All Handler
app.use((req, _res, next) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, "RESOURCE_NOT_FOUND"));
});

// Global Error Handler
app.use(errorHandler);

export default app;