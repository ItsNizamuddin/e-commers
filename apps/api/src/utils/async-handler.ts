import type { RequestHandler } from "express";

export const asyncHandler = <P = any, ResBody = any, ReqBody = any, ReqQuery = any>(
    handler: RequestHandler<P, ResBody, ReqBody, ReqQuery>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
};