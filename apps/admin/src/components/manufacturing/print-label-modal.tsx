"use client";

import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import {
    Modal,
    Button,
    Badge,
    Input,
} from "@ecommers/ui";
import {
    Printer,
    QrCode,
    Sparkles,
    CheckCircle2,
    Calendar,
    Layers,
    Tag,
} from "lucide-react";
import type { FinishedGoodsLot } from "@ecommers/types";

interface PrintLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    lot: FinishedGoodsLot | null;
    productTitle?: string;
    variantTitle?: string;
}

type LabelFormat = "thermal" | "thermal_large" | "sheet";

export function PrintLabelModal({
    isOpen,
    onClose,
    lot,
    productTitle = "Manufactured Food Product",
    variantTitle = "Retail Pack",
}: PrintLabelModalProps) {
    const [format, setFormat] = useState<LabelFormat>("thermal");
    const [copies, setCopies] = useState<number>(1);
    const [qrSvg, setQrSvg] = useState<string>("");

    const verificationToken = lot?.publicVerificationToken || "";
    const verificationUrl = useMemo(() => {
        if (!verificationToken) return "";
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        return `${origin}/verify/${verificationToken}`;
    }, [verificationToken]);

    useEffect(() => {
        if (verificationUrl) {
            QRCode.toString(verificationUrl, {
                type: "svg",
                margin: 1,
                errorCorrectionLevel: "M",
                color: {
                    dark: "#0f172a",
                    light: "#ffffff",
                },
            })
                .then((svg) => {
                    setQrSvg(svg);
                })
                .catch((err) => {
                    console.error("Failed to render QR Code SVG", err);
                });
        }
    }, [verificationUrl]);

    const handlePrint = () => {
        window.print();
    };

    if (!lot) return null;

    const formattedPackedDate = lot.packedAt
        ? new Date(lot.packedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : new Date().toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
          });

    const formattedExpiryDate = lot.expiryDate
        ? new Date(lot.expiryDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "N/A";

    const labelItems = Array.from({ length: Math.min(Math.max(1, copies), 48) });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Print Batch Verification Labels"
            description="Generate thermal roll and sheet labels embedded with verifiable batch QR tokens."
            maxWidth="xl"
        >
            <div className="space-y-6">
                {/* Print Controls (Hidden when printing) */}
                <div className="print:hidden p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                        {/* Format selector */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Label Media Format
                            </label>
                            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800 text-xs font-medium">
                                <button
                                    type="button"
                                    onClick={() => setFormat("thermal")}
                                    className={`flex-1 py-1.5 px-2 rounded-md transition-all ${
                                        format === "thermal"
                                            ? "bg-indigo-600 text-white shadow-xs font-semibold"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    Thermal 50×30mm
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormat("thermal_large")}
                                    className={`flex-1 py-1.5 px-2 rounded-md transition-all ${
                                        format === "thermal_large"
                                            ? "bg-indigo-600 text-white shadow-xs font-semibold"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    Thermal 4"×6"
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormat("sheet")}
                                    className={`flex-1 py-1.5 px-2 rounded-md transition-all ${
                                        format === "sheet"
                                            ? "bg-indigo-600 text-white shadow-xs font-semibold"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    A4 Sheet Grid
                                </button>
                            </div>
                        </div>

                        {/* Copies */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Label Quantity / Copies
                            </label>
                            <Input
                                type="number"
                                min={1}
                                max={48}
                                value={copies}
                                onChange={(e) => setCopies(parseInt(e.target.value, 10) || 1)}
                                className="h-9 text-xs"
                            />
                        </div>

                        {/* Print Button */}
                        <div className="flex justify-end items-end h-full">
                            <Button
                                type="button"
                                onClick={handlePrint}
                                className="w-full sm:w-auto h-9 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 font-semibold shadow-xs"
                            >
                                <Printer className="h-4 w-4" />
                                <span>Print {copies} {copies === 1 ? "Label" : "Labels"}</span>
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-3">
                        <span className="flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            FEFO Batch Verification QR active
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-600">Token: {verificationToken.slice(0, 16)}...</span>
                        <span>•</span>
                        <Badge variant="neutral" className="text-[10px] font-mono">
                            {lot.lotNumber}
                        </Badge>
                    </div>
                </div>

                {/* Print Preview Container */}
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[340px] overflow-auto">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 print:hidden">
                        Printable Label Preview ({format.toUpperCase()})
                    </div>

                    {/* Labels Container with Print-Specific Styles */}
                    <div
                        id="printable-label-area"
                        className={
                            format === "sheet"
                                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2 print:w-full"
                                : "flex flex-col gap-4 print:gap-0 print:w-full"
                        }
                    >
                        {labelItems.map((_, idx) => (
                            <div
                                key={idx}
                                className={
                                    format === "thermal"
                                        ? "w-[300px] h-[190px] bg-white text-slate-900 border border-slate-400 p-2.5 rounded-lg shadow-sm flex flex-col justify-between font-sans print:border-none print:shadow-none print:rounded-none print:w-[50mm] print:h-[30mm] print:p-1.5 print:break-after-page"
                                        : format === "thermal_large"
                                        ? "w-[380px] h-[480px] bg-white text-slate-900 border border-slate-400 p-4 rounded-xl shadow-md flex flex-col justify-between font-sans print:border-none print:shadow-none print:w-[100mm] print:h-[150mm] print:break-after-page"
                                        : "w-[240px] h-[155px] bg-white text-slate-900 border border-slate-300 p-2 rounded-md shadow-xs flex flex-col justify-between font-sans print:border print:border-slate-300 print:shadow-none print:w-[65mm] print:h-[40mm]"
                                }
                            >
                                {/* Header */}
                                <div className="border-b border-slate-900 pb-1 flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-800 truncate max-w-[170px]">
                                        ARTISAN FOOD TRACEABILITY
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-500 font-mono">
                                        FSSAI 10022021000123
                                    </span>
                                </div>

                                {/* Body */}
                                <div className="flex items-start justify-between gap-2 py-1 flex-1">
                                    <div className="space-y-0.5 flex-1 pr-1">
                                        <div className="text-[11px] font-extrabold leading-tight text-slate-950 line-clamp-2">
                                            {productTitle}
                                        </div>
                                        <div className="text-[9px] font-semibold text-indigo-700">
                                            {variantTitle}
                                        </div>

                                        <div className="pt-1 space-y-0.5 text-[8px] leading-tight text-slate-700 font-mono">
                                            <div>
                                                <span className="font-bold">LOT:</span> {lot.lotNumber}
                                            </div>
                                            <div>
                                                <span className="font-bold">PKD:</span> {formattedPackedDate}
                                            </div>
                                            <div>
                                                <span className="font-bold text-rose-800">EXP:</span> {formattedExpiryDate}
                                            </div>
                                        </div>
                                    </div>

                                    {/* QR Code */}
                                    <div className="flex flex-col items-center justify-center shrink-0">
                                        {qrSvg ? (
                                            <div
                                                className="w-16 h-16 [&>svg]:w-full [&>svg]:h-full border border-slate-200 rounded-sm p-0.5 bg-white"
                                                dangerouslySetInnerHTML={{ __html: qrSvg }}
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-slate-100 flex items-center justify-center border border-slate-200">
                                                <QrCode className="h-6 w-6 text-slate-400" />
                                            </div>
                                        )}
                                        <span className="text-[6.5px] font-mono text-slate-500 mt-0.5 tracking-tighter">
                                            SCAN TO VERIFY
                                        </span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="border-t border-slate-900 pt-0.5 flex items-center justify-between text-[7px] text-slate-600 font-mono">
                                    <span className="truncate max-w-[160px]">
                                        Ref: {verificationToken.slice(0, 14)}...
                                    </span>
                                    <span className="font-semibold text-slate-900 uppercase">
                                        AUTHENTIC BATCH
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Print Stylesheet Injection */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            #printable-label-area,
                            #printable-label-area * {
                                visibility: visible;
                            }
                            #printable-label-area {
                                position: fixed;
                                left: 0;
                                top: 0;
                                width: 100%;
                                margin: 0;
                                padding: 0;
                            }
                        }
                    `,
                }}
            />
        </Modal>
    );
}
