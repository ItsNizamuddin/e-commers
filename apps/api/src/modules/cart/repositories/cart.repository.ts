import { ClientSession, Types } from "mongoose";
import { AppError } from "../../../utils/app-error.js";
import { CartModel } from "../models/cart.model.js";
import { CartDocument, CartIdentity, ICartItem } from "../types/cart.types.js";

const GUEST_CART_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class CartRepository {
    /* -------------------------------------------------------------------------- */
    /* Helpers                                                                    */
    /* -------------------------------------------------------------------------- */

    private async saveCart(cart: CartDocument, session?: ClientSession): Promise<CartDocument> {
        if (session) {
            await cart.save({ session });
        } else {
            await cart.save();
        }
        return cart;
    }

    /* -------------------------------------------------------------------------- */
    /* Read Operations                                                            */
    /* -------------------------------------------------------------------------- */

    async findById(cartId: string | Types.ObjectId, session?: ClientSession): Promise<CartDocument | null> {
        return await CartModel.findById(cartId).session(session ?? null).exec();
    }

    async findActiveByUserId(userId: string | Types.ObjectId, session?: ClientSession): Promise<CartDocument | null> {
        return await CartModel.findOne({
            userId: new Types.ObjectId(userId),
            status: { $in: ["ACTIVE", "LOCKED"] },
        })
            .sort({ updatedAt: -1 })
            .session(session ?? null)
            .exec();
    }

    async findActiveBySessionId(sessionId: string, session?: ClientSession): Promise<CartDocument | null> {
        const cart = await CartModel.findOne({
            sessionId,
            status: { $in: ["ACTIVE", "LOCKED"] },
        })
            .sort({ updatedAt: -1 })
            .session(session ?? null)
            .exec();

        if (!cart) return null;

        // Application-Level Expiry Guard:
        // MongoDB TTL cleanup runs asynchronously. If expiresAt < now, consider it expired.
        if (cart.expiresAt && cart.expiresAt.getTime() < Date.now()) {
            await CartModel.deleteOne({ _id: cart._id }).session(session ?? null).exec();
            return null;
        }

        return cart;
    }

    async findActiveByIdentity(identity: CartIdentity, session?: ClientSession): Promise<CartDocument | null> {
        if (identity.type === "AUTHENTICATED") {
            return this.findActiveByUserId(identity.userId, session);
        } else {
            return this.findActiveBySessionId(identity.sessionId, session);
        }
    }

    /* -------------------------------------------------------------------------- */
    /* Creation / Find-or-Create                                                  */
    /* -------------------------------------------------------------------------- */

    async findOrCreateActiveCart(
        identity: CartIdentity,
        currency = "USD",
        session?: ClientSession
    ): Promise<CartDocument> {
        let cart = await this.findActiveByIdentity(identity, session);
        if (cart) {
            return cart;
        }

        const now = new Date();
        const isGuest = identity.type === "GUEST";
        const expiresAt = isGuest ? new Date(now.getTime() + GUEST_CART_TTL_MS) : null;

        const newCartData: Record<string, unknown> = {
            status: "ACTIVE",
            currency: currency.toUpperCase(),
            items: [],
            version: 1,
            expiresAt,
            ...(identity.type === "AUTHENTICATED"
                ? { userId: new Types.ObjectId(identity.userId) }
                : { sessionId: identity.sessionId }),
        };

        const newCart = new CartModel(newCartData);
        await this.saveCart(newCart, session);
        return newCart;
    }

    /* -------------------------------------------------------------------------- */
    /* Write / Mutation Operations (Extends Guest TTL, Enforces OCC & Locks)      */
    /* -------------------------------------------------------------------------- */

    async addItem(
        cartId: string | Types.ObjectId,
        itemData: ICartItem,
        expectedVersion?: number,
        session?: ClientSession
    ): Promise<CartDocument> {
        const cart = await this.findById(cartId, session);
        if (!cart) {
            throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
        }

        // Domain Guard: Locked cart cannot be mutated
        if (cart.status === "LOCKED") {
            throw new AppError("Cart is currently locked for checkout", 409, "CART_LOCKED");
        }
        if (cart.status !== "ACTIVE") {
            throw new AppError(`Cannot modify cart with status '${cart.status}'`, 400, "INVALID_CART_STATUS");
        }

        // Domain Guard: Single-currency invariant
        if (itemData.priceSnapshot.currency.toUpperCase() !== cart.currency.toUpperCase()) {
            throw new AppError(
                `Item currency '${itemData.priceSnapshot.currency}' does not match cart currency '${cart.currency}'`,
                400,
                "CURRENCY_MISMATCH"
            );
        }

        // Domain Guard: OCC
        if (expectedVersion !== undefined && cart.version !== expectedVersion) {
            throw new AppError(
                `Cart version conflict. Expected ${expectedVersion}, found ${cart.version}`,
                409,
                "OCC_CONFLICT"
            );
        }

        // Invariant: A Cart may contain at most one CartItem for a given variantId.
        const existingItem = cart.items.find((i) => i.variantId === itemData.variantId);
        if (existingItem) {
            existingItem.quantity += itemData.quantity;
            existingItem.priceSnapshot = itemData.priceSnapshot;
            if (itemData.attributes) {
                existingItem.attributes = itemData.attributes;
            }
        } else {
            cart.items.push(itemData as any);
        }

        // Reset TTL for guest carts on write mutations
        if (cart.sessionId && !cart.userId) {
            cart.expiresAt = new Date(Date.now() + GUEST_CART_TTL_MS);
        }

        cart.version += 1;
        await this.saveCart(cart, session);
        return cart;
    }

    async updateItemQuantity(
        cartId: string | Types.ObjectId,
        variantId: string,
        quantity: number,
        expectedVersion?: number,
        session?: ClientSession
    ): Promise<CartDocument> {
        const cart = await this.findById(cartId, session);
        if (!cart) {
            throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
        }

        if (cart.status === "LOCKED") {
            throw new AppError("Cart is currently locked for checkout", 409, "CART_LOCKED");
        }
        if (cart.status !== "ACTIVE") {
            throw new AppError(`Cannot modify cart with status '${cart.status}'`, 400, "INVALID_CART_STATUS");
        }

        if (expectedVersion !== undefined && cart.version !== expectedVersion) {
            throw new AppError(
                `Cart version conflict. Expected ${expectedVersion}, found ${cart.version}`,
                409,
                "OCC_CONFLICT"
            );
        }

        const itemIndex = cart.items.findIndex((i) => i.variantId === variantId);
        if (itemIndex === -1) {
            throw new AppError(`Item with variantId '${variantId}' not found in cart`, 404, "CART_ITEM_NOT_FOUND");
        }

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            const item = cart.items[itemIndex];
            if (item) {
                item.quantity = quantity;
            }
        }

        if (cart.sessionId && !cart.userId) {
            cart.expiresAt = new Date(Date.now() + GUEST_CART_TTL_MS);
        }

        cart.version += 1;
        await this.saveCart(cart, session);
        return cart;
    }

    async removeItem(
        cartId: string | Types.ObjectId,
        variantId: string,
        expectedVersion?: number,
        session?: ClientSession
    ): Promise<CartDocument> {
        const cart = await this.findById(cartId, session);
        if (!cart) {
            throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
        }

        if (cart.status === "LOCKED") {
            throw new AppError("Cart is currently locked for checkout", 409, "CART_LOCKED");
        }
        if (cart.status !== "ACTIVE") {
            throw new AppError(`Cannot modify cart with status '${cart.status}'`, 400, "INVALID_CART_STATUS");
        }

        if (expectedVersion !== undefined && cart.version !== expectedVersion) {
            throw new AppError(
                `Cart version conflict. Expected ${expectedVersion}, found ${cart.version}`,
                409,
                "OCC_CONFLICT"
            );
        }

        const itemIndex = cart.items.findIndex((i) => i.variantId === variantId);
        if (itemIndex === -1) {
            throw new AppError(`Item with variantId '${variantId}' not found in cart`, 404, "CART_ITEM_NOT_FOUND");
        }

        cart.items.splice(itemIndex, 1);

        if (cart.sessionId && !cart.userId) {
            cart.expiresAt = new Date(Date.now() + GUEST_CART_TTL_MS);
        }

        cart.version += 1;
        await this.saveCart(cart, session);
        return cart;
    }

    async clearCart(
        cartId: string | Types.ObjectId,
        expectedVersion?: number,
        session?: ClientSession
    ): Promise<CartDocument> {
        const cart = await this.findById(cartId, session);
        if (!cart) {
            throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
        }

        if (cart.status === "LOCKED") {
            throw new AppError("Cart is currently locked for checkout", 409, "CART_LOCKED");
        }
        if (cart.status !== "ACTIVE") {
            throw new AppError(`Cannot modify cart with status '${cart.status}'`, 400, "INVALID_CART_STATUS");
        }

        if (expectedVersion !== undefined && cart.version !== expectedVersion) {
            throw new AppError(
                `Cart version conflict. Expected ${expectedVersion}, found ${cart.version}`,
                409,
                "OCC_CONFLICT"
            );
        }

        cart.items = [] as any;

        if (cart.sessionId && !cart.userId) {
            cart.expiresAt = new Date(Date.now() + GUEST_CART_TTL_MS);
        }

        cart.version += 1;
        await this.saveCart(cart, session);
        return cart;
    }

    /* -------------------------------------------------------------------------- */
    /* Checkout-Controlled Lifecycle State Machine Operations                     */
    /* -------------------------------------------------------------------------- */

    async lockCart(cartId: string | Types.ObjectId, session?: ClientSession): Promise<CartDocument> {
        const cart = await this.findById(cartId, session);
        if (!cart) {
            throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
        }
        if (cart.status !== "ACTIVE") {
            throw new AppError(`Cannot lock cart with status '${cart.status}'`, 400, "INVALID_CART_STATUS");
        }

        cart.status = "LOCKED";
        cart.lockedAt = new Date();
        cart.version += 1;
        await this.saveCart(cart, session);
        return cart;
    }

    async unlockCart(cartId: string | Types.ObjectId, session?: ClientSession): Promise<CartDocument> {
        const cart = await this.findById(cartId, session);
        if (!cart) {
            throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
        }
        if (cart.status !== "LOCKED") {
            throw new AppError(`Cannot unlock cart with status '${cart.status}'`, 400, "INVALID_CART_STATUS");
        }

        cart.status = "ACTIVE";
        cart.lockedAt = undefined;
        cart.version += 1;
        await this.saveCart(cart, session);
        return cart;
    }

    async convertToOrder(cartId: string | Types.ObjectId, session?: ClientSession): Promise<CartDocument> {
        const cart = await this.findById(cartId, session);
        if (!cart) {
            throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
        }

        cart.status = "CONVERTED_TO_ORDER";
        cart.version += 1;
        await this.saveCart(cart, session);
        return cart;
    }

    async markAsMerged(cartId: string | Types.ObjectId, session?: ClientSession): Promise<CartDocument> {
        const cart = await this.findById(cartId, session);
        if (!cart) {
            throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
        }

        cart.status = "MERGED";
        cart.version += 1;
        await this.saveCart(cart, session);
        return cart;
    }
}

export const cartRepository = new CartRepository();
