import type { Request, Response } from "express";
import { reviewService, ReviewService } from "../services/review.service.js";
import type {
    CreateReviewInput,
    UpdateReviewInput,
    ReviewQuery,
} from "../validation/review.validation.js";

export class ReviewController {
    constructor(private readonly svc: ReviewService = reviewService) {}

    createReview = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.id;
        const productId = req.params.productId as string;
        const input = req.body as CreateReviewInput;

        const review = await this.svc.createReview(userId, productId, input);

        res.status(201).json({
            success: true,
            data: review,
        });
    };

    getProductReviews = async (req: Request, res: Response): Promise<void> => {
        const productId = req.params.productId as string;
        const query = req.query as unknown as ReviewQuery;
        const currentUserId = req.user?.id;

        const result = await this.svc.getProductReviews(productId, query, currentUserId);

        res.status(200).json({
            success: true,
            data: result.reviews,
            summary: result.summary,
            pagination: result.pagination,
        });
    };

    updateReview = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.id;
        const id = req.params.id as string;
        const input = req.body as UpdateReviewInput;

        const review = await this.svc.updateReview(id, userId, input);

        res.status(200).json({
            success: true,
            data: review,
        });
    };

    deleteReview = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const id = req.params.id as string;

        const result = await this.svc.deleteReview(id, userId, userRole);

        res.status(200).json({
            success: true,
            data: result,
        });
    };

    toggleHelpfulVote = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.id;
        const id = req.params.id as string;

        const result = await this.svc.toggleHelpfulVote(id, userId);

        res.status(200).json({
            success: true,
            data: result,
        });
    };
}

export const reviewController = new ReviewController();
