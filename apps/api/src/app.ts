import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middleware/error-handler.js";
import { AppError } from "./utils/app-error.js";
import { env } from "./config/env.js";

const app = express();

app.use(helmet());
app.use(cors({
    origin: env.corsOrigin,
    credentials: true,
}));
app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: "ok",
        },
    });
});

// 404 Catch-All Handler
app.use((req, _res, next) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, "RESOURCE_NOT_FOUND"));
});

// Global Error Handler
app.use(errorHandler);

export default app;