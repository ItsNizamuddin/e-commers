"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import type {
    InventoryResponse,
    StockMovementResponse,
} from "@ecommers/types";
import {
    Card,
    Badge,
    Spinner,
    ErrorState,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Pagination,
    Button,
    Modal,
    Input,
    FormField,
    TableAction,
    TableActionGroup,
} from "@ecommers/ui";
import {
    Warehouse,
    RefreshCw,
    Sliders,
    Layers,
    CheckCircle2,
} from "lucide-react";
import { RequireRole } from "../../../components/auth/require-role";

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<"matrix" | "movements">("matrix");

    // Inventory State
    const [items, setItems] = useState<InventoryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Movements State
    const [movements, setMovements] = useState<StockMovementResponse[]>([]);
    const [movementsLoading, setMovementsLoading] = useState(false);

    // Adjust Modal State
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState<InventoryResponse | null>(null);
    const [delta, setDelta] = useState("10");
    const [adjustReason, setAdjustReason] = useState("");
    const [isAdjusting, setIsAdjusting] = useState(false);

    // Thresholds Modal State
    const [isThresholdOpen, setIsThresholdOpen] = useState(false);
    const [reorderThreshold, setReorderThreshold] = useState("10");
    const [safetyStock, setSafetyStock] = useState("5");
    const [isSavingThresholds, setIsSavingThresholds] = useState(false);

    const [notice, setNotice] = useState<string | null>(null);

    const fetchInventory = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const res = await api.inventory.list({
                page,
                limit: 10,
            });
            setItems(res.items || []);
            setTotalPages(res.pagination?.totalPages || 1);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to fetch inventory records.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page]);

    const fetchMovements = useCallback(async () => {
        setMovementsLoading(true);
        try {
            const res = await api.inventory.movements({ page: 1, limit: 15 });
            setMovements(res.items || []);
        } catch {
            // Non-critical if empty
        } finally {
            setMovementsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === "matrix") {
            fetchInventory();
        } else {
            fetchMovements();
        }
    }, [activeTab, fetchInventory, fetchMovements]);

    const handleAdjustSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInventory) return;

        setIsAdjusting(true);
        try {
            await api.inventory.adjust({
                inventoryId: selectedInventory.id,
                delta: parseInt(delta, 10) || 0,
                reason: adjustReason.trim() || "Administrative stock correction",
                referenceType: "MANUAL_ADJUSTMENT",
            });
            setIsAdjustOpen(false);
            setNotice(`Stock adjusted for variant ${selectedInventory.variantId.slice(-8)}`);
            setTimeout(() => setNotice(null), 3500);
            fetchInventory(true);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Adjustment failed: ${err.message}`);
            }
        } finally {
            setIsAdjusting(false);
        }
    };

    const handleThresholdsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInventory) return;

        setIsSavingThresholds(true);
        try {
            await api.inventory.updateThresholds(selectedInventory.id, {
                reorderThreshold: parseInt(reorderThreshold, 10) || 10,
                safetyStock: parseInt(safetyStock, 10) || 5,
                expectedVersion: selectedInventory.version,
            });
            setIsThresholdOpen(false);
            setNotice(`Thresholds updated for variant ${selectedInventory.variantId.slice(-8)}`);
            setTimeout(() => setNotice(null), 3500);
            fetchInventory(true);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Thresholds update failed: ${err.message}`);
            }
        } finally {
            setIsSavingThresholds(false);
        }
    };

    const openAdjust = (item: InventoryResponse) => {
        setSelectedInventory(item);
        setDelta("5");
        setAdjustReason("");
        setIsAdjustOpen(true);
    };

    const openThresholds = (item: InventoryResponse) => {
        setSelectedInventory(item);
        setReorderThreshold(item.reorderThreshold.toString());
        setSafetyStock(item.safetyStock.toString());
        setIsThresholdOpen(true);
    };

    return (
        <RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT_AGENT"]}>
            <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Warehouse size={15} />
                        </div>
                        <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                            Inventory Matrix & Movements
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Monitor real-time warehouse stock, track immutable movements, and configure buffer thresholds.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => (activeTab === "matrix" ? fetchInventory(true) : fetchMovements())}
                        isLoading={refreshing || movementsLoading}
                        className="gap-1.5"
                    >
                        <RefreshCw size={13} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {notice && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs">
                    <CheckCircle2 size={15} />
                    <span>{notice}</span>
                </div>
            )}

            {/* Tabs Navigation Card */}
            <Card className="p-1">
                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveTab("matrix")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                            activeTab === "matrix"
                                ? "bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-white font-semibold"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-neutral-800/50 font-medium"
                        }`}
                    >
                        <Warehouse size={13} />
                        <span>Stock Matrix</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("movements")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                            activeTab === "movements"
                                ? "bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-white font-semibold"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-neutral-800/50 font-medium"
                        }`}
                    >
                        <Layers size={13} />
                        <span>Movement Audit Ledger</span>
                    </button>
                </div>
            </Card>

            {/* Tab 1: Stock Matrix */}
            {activeTab === "matrix" && (
                <Card className="p-3.5 sm:p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Spinner size="md" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Loading warehouse inventory...</p>
                        </div>
                    ) : error ? (
                        <ErrorState title="Failed to load inventory" message={error} onRetry={() => fetchInventory()} />
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Inventory ID / Variant</TableHead>
                                        <TableHead>On Hand</TableHead>
                                        <TableHead>Reserved</TableHead>
                                        <TableHead>Available</TableHead>
                                        <TableHead>Threshold</TableHead>
                                        <TableHead>Safety</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.length === 0 ? (
                                        <TableRow noHover>
                                            <TableCell colSpan={8} className="text-center text-slate-400 dark:text-slate-500 py-12">
                                                No inventory records found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        items.map((it) => {
                                            const available = Math.max(0, it.onHand - it.reserved - it.safetyStock);
                                            const isLow = it.onHand <= it.reorderThreshold;
                                            const isOut = it.onHand === 0;

                                            return (
                                                <TableRow key={it.id}>
                                                    <TableCell>
                                                        <div>
                                                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                                                {it.id.slice(-8).toUpperCase()}
                                                            </span>
                                                            <div className="text-[11px] text-slate-400 dark:text-slate-500">
                                                                Variant: {it.variantId.slice(-8)}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className={`font-bold ${isOut ? "text-red-600 dark:text-red-400" : isLow ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}>
                                                        {it.onHand}
                                                    </TableCell>
                                                    <TableCell className="text-slate-500 dark:text-slate-400">{it.reserved}</TableCell>
                                                    <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                                                        {available}
                                                    </TableCell>
                                                    <TableCell className="text-slate-500 dark:text-slate-400">{it.reorderThreshold}</TableCell>
                                                    <TableCell className="text-slate-500 dark:text-slate-400">{it.safetyStock}</TableCell>
                                                    <TableCell>
                                                        {isOut ? (
                                                            <Badge variant="danger" size="sm">OUT OF STOCK</Badge>
                                                        ) : isLow ? (
                                                            <Badge variant="warning" size="sm">LOW STOCK</Badge>
                                                        ) : (
                                                            <Badge variant="success" size="sm">HEALTHY</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <TableActionGroup>
                                                            <TableAction
                                                                icon={<RefreshCw size={14} />}
                                                                label="Adjust"
                                                                onClick={() => openAdjust(it)}
                                                                title="Adjust Stock"
                                                            />
                                                            <TableAction
                                                                icon={<Sliders size={14} />}
                                                                label="Buffers"
                                                                onClick={() => openThresholds(it)}
                                                                title="Configure Thresholds"
                                                            />
                                                        </TableActionGroup>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>

                            {totalPages > 1 && (
                                <div className="mt-4 flex justify-end">
                                    <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
                                </div>
                            )}
                        </>
                    )}
                </Card>
            )}

            {/* Tab 2: Movement Audit Ledger */}
            {activeTab === "movements" && (
                <Card className="p-3.5 sm:p-4">
                    {movementsLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <Spinner size="md" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Loading audit ledger...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Variant ID</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Delta</TableHead>
                                    <TableHead>On-Hand (Prev → New)</TableHead>
                                    <TableHead>Reason</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.length === 0 ? (
                                    <TableRow noHover>
                                        <TableCell colSpan={6} className="text-center text-slate-400 dark:text-slate-500 py-10">
                                            No stock movement logs recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    movements.map((m) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                                                {new Date(m.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "medium" })}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                                    {m.variantId.slice(-8)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="neutral" size="sm">{m.type}</Badge>
                                            </TableCell>
                                            <TableCell className={`font-bold ${m.quantityDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                                {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                                                {m.previousOnHand} → {m.newOnHand}
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-300 text-xs">
                                                {m.reason || "Manual adjustment"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            )}

            {/* Adjust Modal */}
            <Modal
                isOpen={isAdjustOpen}
                onClose={() => !isAdjusting && setIsAdjustOpen(false)}
                title={`Adjust Stock • Variant ${selectedInventory?.variantId.slice(-8)}`}
                description="Record stock adjustments with audit trail reason."
            >
                <form onSubmit={handleAdjustSubmit} className="flex flex-col gap-3.5">
                    <FormField label="Quantity Change (+ or - integer)" required>
                        <Input
                            type="number"
                            value={delta}
                            onChange={(e) => setDelta(e.target.value)}
                            disabled={isAdjusting}
                        />
                    </FormField>

                    <FormField label="Audit Notes / Justification" required>
                        <Input
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="e.g. Received carton from supplier batch #481"
                            disabled={isAdjusting}
                        />
                    </FormField>

                    <div className="flex justify-end gap-2 mt-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => setIsAdjustOpen(false)} disabled={isAdjusting}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="sm" isLoading={isAdjusting} disabled={isAdjusting}>
                            Confirm Adjustment
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Thresholds Modal */}
            <Modal
                isOpen={isThresholdOpen}
                onClose={() => !isSavingThresholds && setIsThresholdOpen(false)}
                title={`Buffer Thresholds • Variant ${selectedInventory?.variantId.slice(-8)}`}
                description="Update reorder alert triggers and safety buffer inventory."
            >
                <form onSubmit={handleThresholdsSubmit} className="flex flex-col gap-3.5">
                    <FormField label="Reorder Threshold" required>
                        <Input
                            type="number"
                            value={reorderThreshold}
                            onChange={(e) => setReorderThreshold(e.target.value)}
                            disabled={isSavingThresholds}
                        />
                    </FormField>

                    <FormField label="Safety Stock Buffer" required>
                        <Input
                            type="number"
                            value={safetyStock}
                            onChange={(e) => setSafetyStock(e.target.value)}
                            disabled={isSavingThresholds}
                        />
                    </FormField>

                    <div className="flex justify-end gap-2 mt-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => setIsThresholdOpen(false)} disabled={isSavingThresholds}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="sm" isLoading={isSavingThresholds} disabled={isSavingThresholds}>
                            Save Thresholds
                        </Button>
                    </div>
                </form>
            </Modal>
            </div>
        </RequireRole>
    );
}
