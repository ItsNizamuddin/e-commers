"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import type { CategoryResponse } from "@ecommers/types";
import {
    Card,
    Button,
    Input,
    Select,
    Textarea,
    Label,
    FormField,
} from "@ecommers/ui";
import {
    ArrowLeft,
    Package,
    Layers,
    Utensils,
    FolderPlus,
    AlertCircle,
} from "lucide-react";

const COMMON_DIETARY_TAGS = [
    "Veg (Pure Vegetarian)",
    "Non-Veg",
    "Eggless",
    "Pure Desi Ghee",
    "Jain (No Onion/Garlic)",
    "Halal",
    "Gluten-Free",
    "Organic",
];

export default function NewProductPage() {
    const router = useRouter();
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    // Form fields
    const [title, setTitle] = useState("");
    const [brand, setBrand] = useState("Royal Kitchens");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED");

    // Food & Dietary specifics
    const [storageInstructions, setStorageInstructions] = useState("");
    const [allergens, setAllergens] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>(["Non-Veg"]);
    const [servingSize, setServingSize] = useState("");
    const [calories, setCalories] = useState("");
    const [protein, setProtein] = useState("");
    const [carbs, setCarbs] = useState("");
    const [fat, setFat] = useState("");

    // Variant & Pricing fields
    const [sku, setSku] = useState("");
    const [variantTitle, setVariantTitle] = useState("Full Handi (Serves 2)");
    const [priceInr, setPriceInr] = useState("349.00");
    const [priceUsd, setPriceUsd] = useState("4.99");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        setLoadingCategories(true);
        api.categories.list()
            .then((res) => {
                setCategories(res || []);
                if (res && res.length > 0) {
                    setCategoryId(res[0].id);
                }
            })
            .catch(() => {})
            .finally(() => setLoadingCategories(false));
    }, []);

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!title.trim()) {
            setFormError("Product title is required.");
            return;
        }

        if (!categoryId) {
            setFormError("Please select a category or create one first.");
            return;
        }

        const inrAmount = parseFloat(priceInr);
        if (isNaN(inrAmount) || inrAmount < 0) {
            setFormError("Please provide a valid INR price.");
            return;
        }

        const generatedSku = sku.trim() || `PRD-${Date.now().toString().slice(-6)}`;

        const allergenList = allergens
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean);

        const nutrition = (calories || protein || carbs || fat || servingSize)
            ? {
                  servingSize: servingSize.trim() || undefined,
                  calories: calories ? parseFloat(calories) : undefined,
                  protein: protein ? parseFloat(protein) : undefined,
                  carbohydrates: carbs ? parseFloat(carbs) : undefined,
                  fat: fat ? parseFloat(fat) : undefined,
              }
            : undefined;

        const prices = [
            { currency: "INR", amount: inrAmount },
        ];

        const usdAmount = parseFloat(priceUsd);
        if (!isNaN(usdAmount) && usdAmount >= 0) {
            prices.push({ currency: "USD", amount: usdAmount });
        }

        setIsSubmitting(true);
        try {
            await api.products.create({
                title: title.trim(),
                brand: brand.trim() || undefined,
                description: description.trim() || "Authentic culinary product prepared with fresh ingredients.",
                categoryId,
                status,
                tags: selectedTags,
                storageInstructions: storageInstructions.trim() || undefined,
                allergens: allergenList.length > 0 ? allergenList : undefined,
                nutritionInfo: nutrition,
                variants: [
                    {
                        sku: generatedSku,
                        title: variantTitle.trim() || "Standard Pack",
                        prices,
                        attributes: {
                            portion: variantTitle.trim() || "Standard",
                        },
                    },
                ],
            });

            router.push("/products");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setFormError(err.message);
            } else {
                setFormError("Failed to create product.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Navigation & Header */}
            <div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/products")}
                    className="gap-1.5 mb-3"
                >
                    <ArrowLeft size={13} />
                    <span>Back to Products</span>
                </Button>

                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
                        <Package size={15} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Create Product
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Configure product details, category, pricing, and food attributes.
                        </p>
                    </div>
                </div>
            </div>

            {/* If no categories exist, prompt user to create category first */}
            {!loadingCategories && categories.length === 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-amber-800 dark:text-amber-300">
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <AlertCircle size={16} className="text-amber-600 shrink-0" />
                        <span>No categories found. A product must belong to a category. Please create a category first.</span>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => router.push("/categories")}
                        className="gap-1.5 shrink-0"
                    >
                        <FolderPlus size={13} />
                        <span>Create Category</span>
                    </Button>
                </div>
            )}

            {formError && (
                <div className="p-2.5 px-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium">
                    {formError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* General Info Card */}
                <Card className="p-3.5 sm:p-4">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3.5 flex items-center gap-1.5">
                        <Package size={15} className="text-blue-600 dark:text-blue-400" />
                        <span>Product Details</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Product Title" required>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Hyderabadi Chicken Dum Biryani"
                                disabled={isSubmitting}
                            />
                        </FormField>

                        <FormField label="Brand / Producer">
                            <Input
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                placeholder="e.g. Royal Kitchens"
                                disabled={isSubmitting}
                            />
                        </FormField>

                        <FormField label="Category" required>
                            <Select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                disabled={isSubmitting || categories.length === 0}
                            >
                                {categories.length === 0 ? (
                                    <option value="">No categories defined yet</option>
                                ) : (
                                    categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))
                                )}
                            </Select>
                        </FormField>

                        <FormField label="Status" required>
                            <Select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                disabled={isSubmitting}
                            >
                                <option value="PUBLISHED">Published (Available on Store)</option>
                                <option value="DRAFT">Draft (Internal Only)</option>
                            </Select>
                        </FormField>
                    </div>

                    <div className="mt-4">
                        <FormField label="Description">
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. Authentic slow-cooked dum biryani prepared with premium aged basmati rice, tender chicken pieces, aromatic Indian whole spices, and pure desi ghee."
                                rows={3}
                                disabled={isSubmitting}
                            />
                        </FormField>
                    </div>
                </Card>

                {/* Food, Dietary & Storage Specifications Card */}
                <Card className="p-3.5 sm:p-4">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3.5 flex items-center gap-1.5">
                        <Utensils size={15} className="text-blue-600 dark:text-blue-400" />
                        <span>Food & Dietary Specifications</span>
                    </h2>

                    {/* Dietary Tags */}
                    <div className="mb-4">
                        <Label className="block mb-2">
                            Dietary & Lifestyle Tags
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                            {COMMON_DIETARY_TAGS.map((tag) => {
                                const active = selectedTags.includes(tag);
                                return (
                                    <button
                                        type="button"
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all ${
                                            active
                                                ? "bg-blue-600 text-white shadow-xs"
                                                : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-neutral-700"
                                        }`}
                                    >
                                        {active ? `✓ ${tag}` : `+ ${tag}`}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Storage Instructions & Shelf Life">
                            <Input
                                value={storageInstructions}
                                onChange={(e) => setStorageInstructions(e.target.value)}
                                placeholder="e.g. Keep refrigerated below 4°C. Best consumed within 24 hours."
                                disabled={isSubmitting}
                            />
                        </FormField>

                        <FormField label="Allergens (Comma separated)">
                            <Input
                                value={allergens}
                                onChange={(e) => setAllergens(e.target.value)}
                                placeholder="e.g. Milk, Cashews, Mustard, Gluten"
                                disabled={isSubmitting}
                            />
                        </FormField>
                    </div>

                    {/* Nutritional Facts Grid */}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-neutral-800">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                            Nutrition Facts (Optional Per Serving)
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                            <div>
                                <Label className="text-[11px] block mb-1">
                                    Serving Size
                                </Label>
                                <Input
                                    value={servingSize}
                                    onChange={(e) => setServingSize(e.target.value)}
                                    placeholder="e.g. 1 Handi / 350g"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <Label className="text-[11px] block mb-1">
                                    Calories (kcal)
                                </Label>
                                <Input
                                    type="number"
                                    value={calories}
                                    onChange={(e) => setCalories(e.target.value)}
                                    placeholder="e.g. 520"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <Label className="text-[11px] block mb-1">
                                    Protein (g)
                                </Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={protein}
                                    onChange={(e) => setProtein(e.target.value)}
                                    placeholder="e.g. 24"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <Label className="text-[11px] block mb-1">
                                    Carbs (g)
                                </Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={carbs}
                                    onChange={(e) => setCarbs(e.target.value)}
                                    placeholder="e.g. 56"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <Label className="text-[11px] block mb-1">
                                    Fat (g)
                                </Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={fat}
                                    onChange={(e) => setFat(e.target.value)}
                                    placeholder="e.g. 18"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Portion Size & Multi-Currency Pricing Card */}
                <Card className="p-3.5 sm:p-4">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3.5 flex items-center gap-1.5">
                        <Layers size={15} className="text-blue-600 dark:text-blue-400" />
                        <span>Portion & Pricing</span>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField label="SKU">
                            <Input
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                placeholder="e.g. BIRYANI-HYD-01"
                                disabled={isSubmitting}
                            />
                        </FormField>

                        <FormField label="Portion / Pack Size">
                            <Input
                                value={variantTitle}
                                onChange={(e) => setVariantTitle(e.target.value)}
                                placeholder="e.g. Full Handi (Serves 2)"
                                disabled={isSubmitting}
                            />
                        </FormField>

                        <FormField label="Price (INR ₹)" required>
                            <Input
                                type="number"
                                step="0.01"
                                value={priceInr}
                                onChange={(e) => setPriceInr(e.target.value)}
                                placeholder="349.00"
                                disabled={isSubmitting}
                            />
                        </FormField>

                        <FormField label="Price (USD $)">
                            <Input
                                type="number"
                                step="0.01"
                                value={priceUsd}
                                onChange={(e) => setPriceUsd(e.target.value)}
                                placeholder="4.99"
                                disabled={isSubmitting}
                            />
                        </FormField>
                    </div>
                </Card>

                {/* Submit Bar */}
                <div className="flex justify-end gap-2.5">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push("/products")}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSubmitting}
                        disabled={isSubmitting || categories.length === 0}
                        className="min-w-[130px]"
                    >
                        Create Product
                    </Button>
                </div>
            </form>
        </div>
    );
}
