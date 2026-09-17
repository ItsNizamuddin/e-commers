"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useGetRecipeByIdQuery } from "../../../../store/api";
import { RecipeBuilder } from "../../../../components/manufacturing/recipe-builder";
import { Spinner, ErrorState } from "@ecommers/ui";

export default function EditRecipePage() {
    const params = useParams();
    const id = params?.id as string;

    const {
        data: recipe,
        isLoading: loading,
        error: recipeError,
        refetch,
    } = useGetRecipeByIdQuery(id, { skip: !id });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-28">
                <Spinner size="lg" />
                <p className="text-xs text-slate-400 mt-2">Loading recipe formula...</p>
            </div>
        );
    }

    if (recipeError || !recipe) {
        return (
            <div className="py-20 text-center">
                <ErrorState
                    title="Recipe Not Found"
                    message={
                        recipeError
                            ? typeof recipeError === "string"
                                ? recipeError
                                : "Failed to load recipe."
                            : "Recipe not found."
                    }
                    onRetry={() => refetch()}
                />
            </div>
        );
    }

    return <RecipeBuilder initialRecipe={recipe} isEditing={true} />;
}
