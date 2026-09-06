import type { Request, Response } from "express";
import { wishlistService, WishlistService } from "../services/wishlist.service.js";
import type {
    AddToWishlistSchema,
    MoveWishlistItemToCartSchema,
} from "../validation/wishlist.validation.js";

export class WishlistController {
    constructor(private readonly svc: WishlistService = wishlistService) {}

    getWishlist = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.id;
        const currency = (req.query.currency as string) || "USD";

        const wishlist = await this.svc.getWishlist(userId, currency);

        res.status(200).json({
            success: true,
            data: wishlist,
        });
    };

    addItem = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.id;
        const input = req.body as AddToWishlistSchema;
        const currency = (req.query.currency as string) || "USD";

        const wishlist = await this.svc.addItem(userId, input, currency);

        res.status(201).json({
            success: true,
            data: wishlist,
        });
    };

    removeItem = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.id;
        const variantId = req.params.variantId as string;
        const currency = (req.query.currency as string) || "USD";

        const wishlist = await this.svc.removeItem(userId, variantId, currency);

        res.status(200).json({
            success: true,
            data: wishlist,
        });
    };

    moveItemToCart = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.id;
        const variantId = req.params.variantId as string;
        const body = req.body as MoveWishlistItemToCartSchema;

        const result = await this.svc.moveItemToCart(userId, variantId, body);

        res.status(200).json({
            success: true,
            data: result,
        });
    };

    clearWishlist = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.id;
        const currency = (req.query.currency as string) || "USD";

        const wishlist = await this.svc.clearWishlist(userId, currency);

        res.status(200).json({
            success: true,
            data: wishlist,
        });
    };
}

export const wishlistController = new WishlistController();
