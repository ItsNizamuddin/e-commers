"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
    useGetPackingSessionQuery,
    useStartPackingSessionMutation,
    useVerifyPackingScanMutation,
    useResetPackingSessionMutation,
} from "../../store/api";
import type {
    OrderResponse,
    PackingScanResult,
    PackingSessionResponse,
} from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Select,
    FormField,
    Spinner,
    Modal,
    EmptyState,
    toast,
} from "@ecommers/ui";
import {
    Barcode,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    RotateCcw,
    Volume2,
    VolumeX,
    ShieldAlert,
    PackageCheck,
    History,
    Sparkles,
    Tag,
} from "lucide-react";

interface PackingBenchScannerProps {
    order: OrderResponse;
    onPackingStatusChange?: (status: string) => void;
}

// Sound Synthesizer via Web Audio API (zero external audio file dependencies)
class PackingSoundFx {
    private static ctx: AudioContext | null = null;

    private static getContext(): AudioContext | null {
        if (typeof window === "undefined") return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    static playSuccess() {
        const ctx = this.getContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.setValueAtTime(880, now + 0.1); // A5

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            osc.start(now);
            osc.stop(now + 0.3);
        } catch {
            // Audio context failed or blocked by browser policy
        }
    }

    static playError() {
        const ctx = this.getContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(220, now); // A3
            osc.frequency.setValueAtTime(146.83, now + 0.12); // D3

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.start(now);
            osc.stop(now + 0.38);
        } catch {
            // Audio context failed
        }
    }

    static playCelebration() {
        const ctx = this.getContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                gain.gain.setValueAtTime(0.25, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);

                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.28);
            });
        } catch {
            // Audio context failed
        }
    }
}

export function PackingBenchScanner({ order, onPackingStatusChange }: PackingBenchScannerProps) {
    const orderId = order.id;

    // Station identification
    const [stationId, setStationId] = useState<string>("PACK-BENCH-01");
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

    // Scanner input state
    const [barcodeInput, setBarcodeInput] = useState<string>("");
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Last scan feedback state
    const [lastScanResult, setLastScanResult] = useState<{
        result: PackingScanResult;
        message: string;
        lotNumber?: string;
        expected?: string[];
        isComplete?: boolean;
        timestamp: Date;
    } | null>(null);

    // Reset session dialog
    const [isResetDialogOpen, setIsResetDialogOpen] = useState<boolean>(false);
    const [resetReason, setResetReason] = useState<string>("");

    // Audit drawer
    const [showAuditTrail, setShowAuditTrail] = useState<boolean>(false);

    // RTK Query hooks
    const {
        data: sessionData,
        isLoading: isSessionLoading,
        refetch: refetchSession,
    } = useGetPackingSessionQuery(orderId, { skip: !orderId });

    const [startPackingSession, { isLoading: isStarting }] = useStartPackingSessionMutation();
    const [verifyPackingScan, { isLoading: isScanning }] = useVerifyPackingScanMutation();
    const [resetPackingSession, { isLoading: isResetting }] = useResetPackingSessionMutation();

    const session: PackingSessionResponse | null = sessionData || null;

    // Notify parent about packing status changes
    useEffect(() => {
        if (session?.status && onPackingStatusChange) {
            onPackingStatusChange(session.status);
        }
    }, [session?.status, onPackingStatusChange]);

    // Restore station from localStorage if available
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedStation = localStorage.getItem("packing_bench_station");
            if (savedStation) setStationId(savedStation);
        }
    }, []);

    const handleStationChange = (val: string) => {
        setStationId(val);
        if (typeof window !== "undefined") {
            localStorage.setItem("packing_bench_station", val);
        }
    };

    // Calculate packing progress totals
    const totalRequired = session?.items?.reduce((acc, it) => acc + it.requiredQty, 0) || 0;
    const totalVerified = session?.items?.reduce((acc, it) => acc + it.verifiedQty, 0) || 0;
    const progressPercent = totalRequired > 0 ? Math.round((totalVerified / totalRequired) * 100) : 0;
    const isSessionVerified = session?.status === "VERIFIED" || (totalRequired > 0 && totalVerified >= totalRequired);

    // Check if order has any allocated FEFO lots
    const hasAllocatedLots = order.items?.some(
        (it) => it.allocatedLots && it.allocatedLots.length > 0
    );

    // Start session handler
    const handleStartSession = async () => {
        try {
            await startPackingSession({
                id: orderId,
                body: { stationId },
            }).unwrap();
            toast.success("Packing verification session started");
            setTimeout(() => barcodeInputRef.current?.focus(), 200);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to start session";
            toast.error(msg);
        }
    };

    // Barcode scan submit
    const handleScanSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = barcodeInput.trim();
        if (!code || isScanning) return;

        try {
            const res = await verifyPackingScan({
                id: orderId,
                body: {
                    barcode: code,
                    stationId,
                },
            }).unwrap();

            const isComplete = res.session?.status === "VERIFIED";

            setLastScanResult({
                result: res.scanResult,
                message: res.message,
                lotNumber: res.scannedLotNumber,
                isComplete,
                timestamp: new Date(),
            });

            // Audio cues
            if (soundEnabled) {
                if (isComplete) {
                    PackingSoundFx.playCelebration();
                } else if (res.scanResult === "MATCHED") {
                    PackingSoundFx.playSuccess();
                } else {
                    PackingSoundFx.playError();
                }
            }

            // Clear input and refocus
            setBarcodeInput("");
            barcodeInputRef.current?.focus();
        } catch (err: unknown) {
            if (soundEnabled) PackingSoundFx.playError();
            const msg = err instanceof Error ? err.message : "Scan verification failed";
            toast.error(msg);
            setBarcodeInput("");
            barcodeInputRef.current?.focus();
        }
    };

    // Reset packing session handler
    const handleResetConfirm = async () => {
        if (!resetReason.trim()) {
            toast.error("Please provide a reason for resetting the packing session");
            return;
        }

        try {
            await resetPackingSession({
                id: orderId,
                body: { reason: resetReason.trim(), stationId },
            }).unwrap();
            setIsResetDialogOpen(false);
            setResetReason("");
            setLastScanResult(null);
            toast.success("Packing session reset. New clean session initialized.");
            setTimeout(() => barcodeInputRef.current?.focus(), 200);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to reset packing session";
            toast.error(msg);
        }
    };

    if (!hasAllocatedLots) {
        return (
            <EmptyState
                title="No FEFO Lots Allocated"
                description="This order does not contain batch-tracked finished goods lots requiring barcode verification."
                icon={<PackageCheck size={22} className="text-slate-400" />}
                className="bg-slate-50/50 dark:bg-neutral-900/40 border-slate-300 dark:border-neutral-800"
            />
        );
    }

    return (
        <Card className="p-4 border-2 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/20 to-transparent dark:from-indigo-950/10">
            {/* Header / Station Selection / Sound Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
                        <Barcode size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                Packing Bench Barcode Scanner
                            </span>
                            {session?.status === "VERIFIED" ? (
                                <Badge variant="success" size="sm">
                                    <CheckCircle2 size={12} className="mr-1 inline" /> VERIFIED
                                </Badge>
                            ) : session?.status === "IN_PROGRESS" ? (
                                <Badge variant="warning" size="sm">
                                    IN PROGRESS ({progressPercent}%)
                                </Badge>
                            ) : (
                                <Badge variant="neutral" size="sm">NOT STARTED</Badge>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                            Verify physical jars match FEFO-allocated finished goods before carton sealing.
                        </p>
                    </div>
                </div>

                {/* Station Selection & Sound */}
                <div className="flex items-center gap-2">
                    <div className="w-36">
                        <Select
                            size="sm"
                            value={stationId}
                            onChange={(e) => handleStationChange(e.target.value)}
                            title="Packing Bench Station"
                        >
                            <option value="PACK-BENCH-01">Station #01</option>
                            <option value="PACK-BENCH-02">Station #02</option>
                            <option value="PACK-BENCH-03">Station #03</option>
                            <option value="PACK-BENCH-04">Station #04</option>
                        </Select>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        title={soundEnabled ? "Mute audio cues" : "Enable audio cues"}
                        className="px-2"
                    >
                        {soundEnabled ? <Volume2 size={14} className="text-indigo-600 dark:text-indigo-400" /> : <VolumeX size={14} className="text-slate-400" />}
                    </Button>

                    {session && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsResetDialogOpen(true)}
                            title="Reset verification checklist"
                            className="px-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                            <RotateCcw size={14} />
                        </Button>
                    )}
                </div>
            </div>

            {/* If no session has been started yet */}
            {(!session || session.status === "NOT_STARTED") && (
                <EmptyState
                    title="Ready to Begin Packing Verification"
                    description={`Station ${stationId} is assigned. Click Start to initialize the FEFO verification checklist.`}
                    icon={<Barcode size={24} className="text-indigo-600 dark:text-indigo-400" />}
                    action={{
                        label: isStarting ? "Starting..." : "Start Packing Session",
                        onClick: handleStartSession,
                    }}
                    className="mt-2 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/10"
                />
            )}

            {/* Active or Verified Session View */}
            {session && session.status !== "NOT_STARTED" && (
                <div className="mt-4 flex flex-col gap-4">
                    {/* Overall Progress Meter */}
                    <div className="bg-slate-100 dark:bg-neutral-800/60 p-3 rounded-lg flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-700 dark:text-neutral-200">
                                Packing Progress: {totalVerified} of {totalRequired} Jars Verified
                            </span>
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {progressPercent}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-neutral-700 rounded-full h-2.5 overflow-hidden">
                            <div
                                className={`h-2.5 transition-all duration-300 ${
                                    isSessionVerified ? "bg-emerald-500" : "bg-indigo-600"
                                }`}
                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Celebration / Safe-to-Ship Banner */}
                    {isSessionVerified && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200">
                            <div className="flex items-center gap-2 text-xs font-semibold">
                                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>All allocated FEFO jars verified! Ready for carton sealing & dispatch.</span>
                            </div>
                            <span className="text-[11px] font-mono bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded font-medium">
                                Station: {session.stationId || stationId}
                            </span>
                        </div>
                    )}

                    {/* Scanner Input (Active when not verified, or allowed for re-scans) */}
                    <form onSubmit={handleScanSubmit} className="flex gap-2 items-center">
                        <div className="relative flex-1">
                            <Input
                                ref={barcodeInputRef}
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                placeholder="Scan Jar Barcode or QR Code (e.g. RPK-2026...)"
                                disabled={isScanning}
                                autoFocus
                                className="font-mono text-sm pl-9"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <Barcode size={16} />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={!barcodeInput.trim() || isScanning}
                            isLoading={isScanning}
                            className="shrink-0"
                        >
                            Verify Scan
                        </Button>
                    </form>

                    {/* Last Scan Diagnostic Alert Box */}
                    {lastScanResult && (
                        <div
                            className={`p-3 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                                lastScanResult.result === "MATCHED"
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                                    : lastScanResult.result === "ALREADY_COMPLETED"
                                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
                                    : lastScanResult.result === "RECALLED"
                                    ? "bg-rose-950 text-rose-100 border-rose-800 shadow-md animate-pulse"
                                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                            }`}
                        >
                            <div className="flex items-center justify-between font-bold">
                                <div className="flex items-center gap-1.5">
                                    {lastScanResult.result === "MATCHED" ? (
                                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                                    ) : lastScanResult.result === "RECALLED" ? (
                                        <ShieldAlert size={16} className="text-rose-300" />
                                    ) : lastScanResult.result === "ALREADY_COMPLETED" ? (
                                        <CheckCircle2 size={16} className="text-blue-500" />
                                    ) : (
                                        <XCircle size={16} className="text-rose-600 dark:text-rose-400" />
                                    )}
                                    <span>
                                        {lastScanResult.result === "MATCHED" && "VERIFIED: Jar Matched Allocated Lot"}
                                        {lastScanResult.result === "ALREADY_COMPLETED" && "ALREADY VERIFIED: Requirement Met"}
                                        {lastScanResult.result === "WRONG_LOT" && "❌ WRONG LOT SCANNED"}
                                        {lastScanResult.result === "EXPIRED" && "🚨 EXPIRED LOT — DO NOT PACK"}
                                        {lastScanResult.result === "RECALLED" && "🚨 RECALLED LOT — QUARANTINE IMMEDIATELY"}
                                        {lastScanResult.result === "QUARANTINED" && "⚠️ QUARANTINED LOT — DO NOT DISPATCH"}
                                        {lastScanResult.result === "NOT_FOUND" && "NOT FOUND: Unknown Finished Goods Lot"}
                                        {lastScanResult.result === "INVALID_CODE" && "INVALID BARCODE FORMAT"}
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono opacity-70">
                                    {new Date(lastScanResult.timestamp).toLocaleTimeString()}
                                </span>
                            </div>

                            <p className="mt-0.5 leading-relaxed">
                                {lastScanResult.message}
                            </p>

                            {lastScanResult.expected && lastScanResult.expected.length > 0 && (
                                <div className="mt-1 pt-1 border-t border-rose-200/50 dark:border-rose-800/50 text-[11px] font-mono">
                                    Expected Lot(s): {lastScanResult.expected.join(", ")}
                                </div>
                            )}
                        </div>
                    )}

                    {/* FEFO Checklist Items */}
                    <div className="flex flex-col gap-2">
                        <div className="text-xs font-semibold text-slate-800 dark:text-neutral-200 flex items-center justify-between">
                            <span>Allocated Lots Checklist</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                                Session #{session.sessionNumber || 1}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {session.items?.map((item, idx) => {
                                const isItemComplete = item.verifiedQty >= item.requiredQty;
                                return (
                                    <div
                                        key={idx}
                                        className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                                            isItemComplete
                                                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                                                : "bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                                    isItemComplete
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                                        : "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400"
                                                }`}
                                            >
                                                {isItemComplete ? <CheckCircle2 size={14} /> : (idx + 1)}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-1.5 font-mono font-medium">
                                                    <Link
                                                        href={`/manufacturing/traceability?query=${encodeURIComponent(item.lotNumber)}`}
                                                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                                    >
                                                        <Tag size={12} />
                                                        <span>{item.lotNumber}</span>
                                                    </Link>
                                                </div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">
                                                    Order Item: {item.orderItemId}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress Count */}
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-xs">
                                                <span className={isItemComplete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                                                    {item.verifiedQty}
                                                </span>
                                                <span className="text-slate-400"> / {item.requiredQty}</span>
                                            </div>
                                            <Badge
                                                variant={isItemComplete ? "success" : "warning"}
                                                size="sm"
                                                className="mt-0.5"
                                            >
                                                {isItemComplete ? "VERIFIED" : "PENDING"}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Scan Events Audit Trail Collapsible */}
                    {session.scanEvents && session.scanEvents.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/80 dark:border-neutral-800">
                            <button
                                type="button"
                                onClick={() => setShowAuditTrail(!showAuditTrail)}
                                className="flex items-center justify-between w-full text-xs text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 font-medium"
                            >
                                <div className="flex items-center gap-1.5">
                                    <History size={14} />
                                    <span>Scan Audit Trail ({session.scanEvents.length} events logged)</span>
                                </div>
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                                    {showAuditTrail ? "Hide Trail" : "Show Trail"}
                                </span>
                            </button>

                            {showAuditTrail && (
                                <div className="mt-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                                    {[...session.scanEvents].reverse().map((ev, idx) => (
                                        <div
                                            key={idx}
                                            className="p-2 rounded bg-slate-50 dark:bg-neutral-900 border border-slate-200/60 dark:border-neutral-800 text-[11px] flex justify-between items-center"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={
                                                        ev.result === "MATCHED"
                                                            ? "success"
                                                            : ev.result === "ALREADY_COMPLETED"
                                                            ? "primary"
                                                            : "danger"
                                                    }
                                                    size="sm"
                                                >
                                                    {ev.result}
                                                </Badge>
                                                <span className="font-mono text-slate-700 dark:text-neutral-300">
                                                    {ev.barcode}
                                                </span>
                                            </div>
                                            <div className="text-slate-400 font-mono text-[10px]">
                                                {ev.stationId && <span className="mr-2">{ev.stationId}</span>}
                                                {new Date(ev.scannedAt).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Reset Packing Dialog */}
            <Modal
                isOpen={isResetDialogOpen}
                onClose={() => {
                    if (!isResetting) {
                        setIsResetDialogOpen(false);
                        setResetReason("");
                    }
                }}
                title={`Reset Packing Session #${session?.sessionNumber || 1}`}
                description={`This cancels the current packing verification checklist and starts Session #${((session?.sessionNumber || 1) + 1)}. All previous scan audit logs will be permanently retained.`}
                maxWidth="sm"
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (resetReason.trim() && !isResetting) {
                            handleResetConfirm();
                        }
                    }}
                    className="flex flex-col gap-4 mt-2"
                >
                    <FormField label="Reason for Reset" required>
                        <Input
                            value={resetReason}
                            onChange={(e) => setResetReason(e.target.value)}
                            placeholder="e.g. Wrong jar physically packed, Damaged seal"
                            autoFocus
                        />
                    </FormField>

                    <div className="flex justify-end gap-2.5 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setIsResetDialogOpen(false);
                                setResetReason("");
                            }}
                            disabled={isResetting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                            size="sm"
                            isLoading={isResetting}
                            disabled={!resetReason.trim() || isResetting}
                        >
                            Confirm Reset
                        </Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
}
