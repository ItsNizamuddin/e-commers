import type { Request, Response, NextFunction } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { getQueues } from "./queue.client.js";
import { verifyAccessToken } from "../../utils/jwt.js";
import { env } from "../../config/env.js";

/**
 * Custom authentication middleware specifically designed for the Bull Board web dashboard.
 * Supports:
 * 1. Bearer Authorization header (API requests)
 * 2. ?token= query parameter (one-click launch from the Admin UI in a new browser tab)
 * 3. bull_board_token httpOnly cookie (subsequent static assets and polling calls made by Bull Board)
 */
export function bullBoardAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    let token: string | undefined;

    // 1. Check Authorization Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
    }

    // 2. Check query parameter (passed from Backoffice Jobs page)
    if (!token && typeof req.query.token === "string" && req.query.token.trim()) {
        token = req.query.token.trim();
    }

    // 3. Check cookie (for subsequent AJAX/asset calls inside Bull Board UI)
    if (!token && req.cookies?.bull_board_token) {
        token = req.cookies.bull_board_token;
    }

    if (!token) {
        return res.status(401).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Bull Board | Super Admin Access Required</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        background: #090d16;
                        color: #f8fafc;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        padding: 16px;
                        box-sizing: border-box;
                    }
                    .box {
                        background: #111827;
                        border: 1px solid #1f2937;
                        border-radius: 16px;
                        padding: 36px 28px;
                        max-width: 440px;
                        text-align: center;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    }
                    h2 { color: #38bdf8; margin: 12px 0 8px; font-size: 20px; font-weight: 700; }
                    p { color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 8px 0 20px; }
                    .badge {
                        display: inline-block;
                        background: rgba(56, 189, 248, 0.1);
                        color: #38bdf8;
                        padding: 4px 12px;
                        border-radius: 9999px;
                        font-size: 11px;
                        font-weight: 700;
                        letter-spacing: 0.05em;
                        border: 1px solid rgba(56, 189, 248, 0.25);
                    }
                    .btn {
                        display: inline-block;
                        background: #2563eb;
                        color: #ffffff;
                        padding: 10px 22px;
                        border-radius: 10px;
                        text-decoration: none;
                        font-size: 13px;
                        font-weight: 600;
                        transition: background 0.2s;
                    }
                    .btn:hover { background: #1d4ed8; }
                </style>
            </head>
            <body>
                <div class="box">
                    <span class="badge">SUPER ADMIN ONLY</span>
                    <h2>Bull Board Queue Dashboard</h2>
                    <p>Authentication token required. Please open this visualizer directly from your Backoffice Jobs page by clicking the <strong>Bull Board UI</strong> button.</p>
                    <a href="http://localhost:3001/jobs" class="btn">Return to Backoffice</a>
                </div>
            </body>
            </html>
        `);
    }

    try {
        const payload = verifyAccessToken(token);
        if (payload.role !== "SUPER_ADMIN") {
            return res.status(403).send("Forbidden: Super Admin privileges are required to inspect Redis queues.");
        }

        // Set cookie so Bull Board's internal React UI scripts and polling work seamlessly in the browser tab
        res.cookie("bull_board_token", token, {
            httpOnly: true,
            sameSite: "lax",
            path: "/api/v1/admin/queues",
            secure: env.nodeEnv === "production",
            maxAge: 4 * 60 * 60 * 1000, // 4 hours
        });

        (req as any).user = { id: payload.sub, role: payload.role };
        next();
    } catch {
        return res.status(401).send("Invalid or expired session token. Please re-open from the Backoffice Jobs page.");
    }
}

export function setupBullBoard() {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath("/api/v1/admin/queues");

    const queues = getQueues();

    createBullBoard({
        queues: [
            new BullMQAdapter(queues.notifications),
            new BullMQAdapter(queues.documents),
            new BullMQAdapter(queues.bulkProcessing),
            new BullMQAdapter(queues.maintenance),
        ],
        serverAdapter,
    });

    return serverAdapter.getRouter();
}
