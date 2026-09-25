"use client";

import React, { useState } from "react";
import { ChevronDown, ShieldCheck, AlertCircle, Info, Sparkles } from "lucide-react";
import type { ProductNutritionInfo } from "@ecommers/types";

export interface ProductNutritionPanelProps {
    nutritionInfo?: ProductNutritionInfo;
    allergens?: string[];
    storageInstructions?: string;
    ingredients?: string;
}

export function ProductNutritionPanel({
    nutritionInfo,
    allergens = [],
    storageInstructions,
    ingredients,
}: ProductNutritionPanelProps) {
    const [openSection, setOpenSection] = useState<"nutrition" | "ingredients" | "storage" | null>("nutrition");

    const toggle = (section: "nutrition" | "ingredients" | "storage") => {
        setOpenSection(openSection === section ? null : section);
    };

    return (
        <div className="rounded-2xl border border-zinc-200/80 bg-white overflow-hidden shadow-xs divide-y divide-zinc-200/80">
            {/* 1. Nutritional Facts */}
            <div>
                <button
                    type="button"
                    onClick={() => toggle("nutrition")}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-emerald-600" />
                        <span className="font-bold text-sm text-zinc-900">Nutritional Facts & Lab Profile</span>
                    </div>
                    <ChevronDown
                        size={18}
                        className={`text-zinc-400 transition-transform duration-200 ${
                            openSection === "nutrition" ? "rotate-180" : ""
                        }`}
                    />
                </button>

                {openSection === "nutrition" && (
                    <div className="px-5 pb-5 pt-1 space-y-4">
                        <p className="text-xs text-zinc-500">
                            Serving size: <strong className="text-zinc-800">{nutritionInfo?.servingSize || "100 g / ml"}</strong>. Formulated from 100% natural agricultural produce without synthetic processing aids.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                <span className="block text-[11px] text-zinc-500 font-medium">Energy</span>
                                <span className="text-sm font-bold text-zinc-900 font-mono">
                                    {nutritionInfo?.calories ?? 0} kcal
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                <span className="block text-[11px] text-zinc-500 font-medium">Protein</span>
                                <span className="text-sm font-bold text-zinc-900 font-mono">
                                    {nutritionInfo?.protein ?? 0} g
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                <span className="block text-[11px] text-zinc-500 font-medium">Carbohydrates</span>
                                <span className="text-sm font-bold text-zinc-900 font-mono">
                                    {nutritionInfo?.carbohydrates ?? 0} g
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                <span className="block text-[11px] text-zinc-500 font-medium">Dietary Fiber</span>
                                <span className="text-sm font-bold text-zinc-900 font-mono">
                                    {nutritionInfo?.fiber ?? 0} g
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                <span className="block text-[11px] text-zinc-500 font-medium">Total Fat</span>
                                <span className="text-sm font-bold text-zinc-900 font-mono">
                                    {nutritionInfo?.fat ?? 0} g
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                <span className="block text-[11px] text-zinc-500 font-medium">Natural Sugar</span>
                                <span className="text-sm font-bold text-zinc-900 font-mono">
                                    {nutritionInfo?.sugar ?? 0} g
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                <span className="block text-[11px] text-zinc-500 font-medium">Sodium</span>
                                <span className="text-sm font-bold text-zinc-900 font-mono">
                                    {nutritionInfo?.sodium ?? 0} mg
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-center text-center">
                                <span className="text-[11px] font-bold text-emerald-800">
                                    0% Trans Fats
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Ingredients & Allergen Advisory */}
            <div>
                <button
                    type="button"
                    onClick={() => toggle("ingredients")}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-600" />
                        <span className="font-bold text-sm text-zinc-900">Ingredients & Allergen Information</span>
                    </div>
                    <ChevronDown
                        size={18}
                        className={`text-zinc-400 transition-transform duration-200 ${
                            openSection === "ingredients" ? "rotate-180" : ""
                        }`}
                    />
                </button>

                {openSection === "ingredients" && (
                    <div className="px-5 pb-5 pt-1 space-y-3 text-xs leading-relaxed">
                        <div>
                            <span className="font-semibold text-zinc-900 block mb-1">Single Formulation Ingredients:</span>
                            <p className="text-zinc-600">
                                {ingredients || "100% Certified Pure Single-Origin Harvest. Free of artificial colors, synthetic flavors, and stabilizers."}
                            </p>
                        </div>

                        {allergens.length > 0 ? (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 space-y-1">
                                <span className="font-bold block text-[11px] uppercase tracking-wider">Allergen Notice:</span>
                                <p className="text-xs">
                                    Contains: <strong>{allergens.join(", ")}</strong>. Milled and packed in a facility adhering to strict hygiene and separate batch handling.
                                </p>
                            </div>
                        ) : (
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs flex items-center gap-2">
                                <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                                <span>Naturally free from common artificial allergens and emulsifiers.</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 3. Storage & Shelf Life */}
            <div>
                <button
                    type="button"
                    onClick={() => toggle("storage")}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Info size={16} className="text-zinc-700" />
                        <span className="font-bold text-sm text-zinc-900">Storage Instructions & FEFO Lifecycle</span>
                    </div>
                    <ChevronDown
                        size={18}
                        className={`text-zinc-400 transition-transform duration-200 ${
                            openSection === "storage" ? "rotate-180" : ""
                        }`}
                    />
                </button>

                {openSection === "storage" && (
                    <div className="px-5 pb-5 pt-1 space-y-2.5 text-xs text-zinc-600 leading-relaxed">
                        <p>
                            {storageInstructions || "Store in a cool, dry place away from direct sunlight and humidity. Keep the glass jar tightly sealed after opening."}
                        </p>
                        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 space-y-1">
                            <span className="font-semibold text-zinc-900 block text-[11px]">FEFO Freshness Commitment:</span>
                            <p className="text-[11px]">
                                We operate on strict First-Expired, First-Out (FEFO) warehouse lot allocation to ensure maximum shelf life when your food arrives.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
