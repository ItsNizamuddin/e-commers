import jwt, {
    type SignOptions,
    type JwtPayload,
} from "jsonwebtoken";

import type { UserRole } from "@shopsphere/types";
import { env } from "../config/env.js";

export type SessionType = "CUSTOMER" | "STAFF";

export type AccessTokenPayload = {
    sub: string;
    role: UserRole;
    sessionType: SessionType;
    type: "access";
};

export type RefreshTokenPayload = {
    sub: string;
    role: UserRole;
    sessionType: SessionType;
    type: "refresh";
};

export const signAccessToken = (
    payload: AccessTokenPayload,
): string => {
    return jwt.sign(payload, env.jwtAccessSecret, {
        expiresIn: env.jwtAccessExpiresIn,
    } as SignOptions);
};

export const signRefreshToken = (
    payload: RefreshTokenPayload,
): string => {
    return jwt.sign(payload, env.jwtRefreshSecret, {
        expiresIn: env.jwtRefreshExpiresIn,
    } as SignOptions);
};

export const verifyAccessToken = (
    token: string,
): AccessTokenPayload & JwtPayload => {
    return jwt.verify(
        token,
        env.jwtAccessSecret,
    ) as AccessTokenPayload & JwtPayload;
};

export const verifyRefreshToken = (
    token: string,
): RefreshTokenPayload & JwtPayload => {
    return jwt.verify(
        token,
        env.jwtRefreshSecret,
    ) as RefreshTokenPayload & JwtPayload;
};