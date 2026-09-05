import { Request, Response, NextFunction } from "express";
import { AppError } from "../../../utils/app-error.js";
import {
    addToCartSchema,
    updateCartItemQuantitySchema,
    variantIdParamSchema,
    mergeCartSchema,
} from "../validation/cart.validation.js";
import {
    CART_SESSION_COOKIE_NAME,
    resolveCartIdentity,
} from "../middleware/cart-identity.middleware.js";
import { cartService, CartService } from "../services/cart.service.js";

export class CartController {
    constructor(private readonly service: CartService = cartService) {}

    getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const identity = resolveCartIdentity(req, res);
            const cart = await this.service.getCart(identity);

            res.status(200).json({
                success: true,
                data: cart,
            });
        } catch (error) {
            next(error);
        }
    };

    addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const identity = resolveCartIdentity(req, res);
            const validated = addToCartSchema.parse(req.body);
            const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined;

            const cart = await this.service.addItem(identity, validated, idempotencyKey);

            res.status(200).json({
                success: true,
                data: cart,
            });
        } catch (error) {
            next(error);
        }
    };

    updateItemQuantity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const identity = resolveCartIdentity(req, res);
            const { variantId } = variantIdParamSchema.parse(req.params);
            const validated = updateCartItemQuantitySchema.parse(req.body);

            const cart = await this.service.updateItemQuantity(identity, variantId, validated);

            res.status(200).json({
                success: true,
                data: cart,
            });
        } catch (error) {
            next(error);
        }
    };

    removeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const identity = resolveCartIdentity(req, res);
            const { variantId } = variantIdParamSchema.parse(req.params);
            const expectedVersion = req.query.expectedVersion
                ? Number(req.query.expectedVersion)
                : undefined;

            const cart = await this.service.removeItem(identity, variantId, expectedVersion);

            res.status(200).json({
                success: true,
                data: cart,
            });
        } catch (error) {
            next(error);
        }
    };

    clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const identity = resolveCartIdentity(req, res);
            const expectedVersion = req.query.expectedVersion
                ? Number(req.query.expectedVersion)
                : undefined;

            const cart = await this.service.clearCart(identity, expectedVersion);

            res.status(200).json({
                success: true,
                data: cart,
            });
        } catch (error) {
            next(error);
        }
    };

    mergeCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user || !req.user.id) {
                throw new AppError("Authentication required to merge cart", 401, "UNAUTHORIZED");
            }

            const parsedBody = mergeCartSchema.safeParse(req.body);
            const guestSessionId =
                (parsedBody.success ? parsedBody.data.sessionId : undefined) ||
                req.cookies?.[CART_SESSION_COOKIE_NAME] ||
                (typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"] : undefined);

            if (!guestSessionId) {
                const userCart = await this.service.getCart({
                    type: "AUTHENTICATED",
                    userId: req.user.id,
                });
                res.status(200).json({
                    success: true,
                    data: {
                        cart: userCart,
                        merged: false,
                        issues: [],
                    },
                });
                return;
            }

            const result = await this.service.mergeGuestCart(req.user.id, guestSessionId);

            // Clear guest session cookie upon successful merge
            res.clearCookie(CART_SESSION_COOKIE_NAME, { path: "/" });

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };
}

export const cartController = new CartController();
