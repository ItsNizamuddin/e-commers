import { Request, Response, NextFunction } from "express";
import { resolveCartIdentity } from "../../cart/middleware/cart-identity.middleware.js";
import {
    initCheckoutSchema,
    updateCheckoutAddressesSchema,
    cancelCheckoutSchema,
    paymentWebhookSchema,
} from "../validation/checkout.validation.js";
import { checkoutService, CheckoutService } from "../services/checkout.service.js";

export class CheckoutController {
    constructor(private readonly service: CheckoutService = checkoutService) {}

    initiateCheckout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const identity = resolveCartIdentity(req, res);
            const validated = initCheckoutSchema.parse(req.body);
            const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined;

            const checkout = await this.service.initiateCheckout(identity, validated, idempotencyKey);

            res.status(201).json({
                success: true,
                data: checkout,
            });
        } catch (error) {
            next(error);
        }
    };

    getCheckoutById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const identity = resolveCartIdentity(req, res);
            const checkoutId = req.params.id as string;

            const checkout = await this.service.getCheckoutById(identity, checkoutId);

            res.status(200).json({
                success: true,
                data: checkout,
            });
        } catch (error) {
            next(error);
        }
    };

    updateAddresses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const identity = resolveCartIdentity(req, res);
            const checkoutId = req.params.id as string;
            const validated = updateCheckoutAddressesSchema.parse(req.body);

            const checkout = await this.service.updateAddresses(identity, checkoutId, validated);

            res.status(200).json({
                success: true,
                data: checkout,
            });
        } catch (error) {
            next(error);
        }
    };

    cancelCheckout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const identity = resolveCartIdentity(req, res);
            const checkoutId = req.params.id as string;
            const validated = cancelCheckoutSchema.parse(req.body);

            const checkout = await this.service.cancelCheckout(
                identity,
                checkoutId,
                validated.expectedVersion
            );

            res.status(200).json({
                success: true,
                data: checkout,
            });
        } catch (error) {
            next(error);
        }
    };

    handlePaymentWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const validated = paymentWebhookSchema.parse(req.body);

            const checkout = await this.service.handlePaymentWebhook(validated);

            res.status(200).json({
                success: true,
                data: checkout,
            });
        } catch (error) {
            next(error);
        }
    };
}

export const checkoutController = new CheckoutController();
