"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../../lib/api";
import type { Recipe } from "@ecommers/types";
import { RecipeBuilder } from "../../../../components/manufacturing/recipe-builder";
import { Spinner } from "@ecommers/ui";

export default function EditRecipePage() {
    const params = useParams();
    const id = params?.id as string;
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.manufacturing
            .getRecipeById(id)
            .then((data) => setRecipe(data))
            .catch((err) => {
                console.error("Failed to load recipe:", err);
                setError(err instanceof Error ? err.message : "Failed to load recipe.");
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-28">
                <Spinner size="lg" />
                <p className="text-xs text-slate-400 mt-2">Loading recipe formula...</p>
            </div>
        );
    }

    if (error || !recipe) {
        return (
            <div className="py-20 text-center">
                <p className="text-rose-600 text-sm font-bold">{error || "Recipe not found."}</p>
            </div>
        );
    }

    return <RecipeBuilder initialRecipe={recipe} isEditing={true} />;
}
