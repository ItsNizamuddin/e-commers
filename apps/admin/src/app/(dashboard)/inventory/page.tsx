"use client";

import React, { useState } from "react";
import {
    useGetInventoryListQuery,
    useGetInventoryMovementsQuery,
    useAdjustInventoryMutation,
    useUpdateInventoryThresholdsMutation,
} from "../../../store/api";
import type {
    InventoryResponse,
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
    toast,
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
    const [page, setPage] = useState(1);
    const [movementsPage, setMovementsPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // RTK Query hooks
    const {
        data: inventoryData,
        isLoading: loading,
        isFetching: refreshing,
        error: inventoryError,
        refetch: refetchInventory,
    } = useGetInventoryListQuery({ page, limit: pageSize });

    const items = inventoryData?.items || [];
    const totalPages = inventoryData?.pagination?.totalPages || 1;
    const totalItems = inventoryData?.pagination?.total || 0;

    const {
        data: movementsData,
        isLoading: movementsLoading,
        refetch: refetchMovements,
    } = useGetInventoryMovementsQuery({ page: movementsPage, limit: pageSize }, { skip: activeTab !== "movements" });

    const movements = movementsData?.items || [];
    const movementsTotalPages = movementsData?.pagination?.totalPages || 1;
    const movementsTotalItems = movementsData?.pagination?.total || movements.length;

    const [adjustInventoryMutation, { isLoading: isAdjusting }] = useAdjustInventoryMutation();
    const [updateThresholdsMutation, { isLoading: isSavingThresholds }] = useUpdateInventoryThresholdsMutation();

    // Adjust Modal State
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState<InventoryResponse | null>(null);
    const [delta, setDelta] = useState("10");
    const [adjustReason, setAdjustReason] = useState("");

    // Thresholds Modal State
    const [isThresholdOpen, setIsThresholdOpen] = useState(false);
    const [reorderThreshold, setReorderThreshold] = useState("10");
    const [safetyStock, setSafetyStock] = useState("5");

    const [notice, setNotice] = useState<string | null>(null);

    const error = inventoryError
        ? typeof inventoryError === "string"
            ? inventoryError
            : "Failed to fetch inventory records."
        : null;

    const handleAdjustSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInventory) return;

        try {
            await adjustInventoryMutation({
                inventoryId: selectedInventory.id,
                delta: parseInt(delta, 10) || 0,
                reason: adjustReason.trim() || "Administrative stock correction",
                referenceType: "MANUAL_ADJUSTMENT",
            }).unwrap();
            setIsAdjustOpen(false);
            const msg = `Stock adjusted for variant ${selectedInventory.variantId.slice(-8)}`;
            setNotice(msg);
            toast.success(msg);
            setTimeout(() => setNotice(null), 3500);
        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error(`Adjustment failed: ${err.message}`);
            }
        }
    };

    const handleThresholdsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInventory) return;

        try {
            await updateThresholdsMutation({
                id: selectedInventory.id,
                body: {
                    reorderThreshold: parseInt(reorderThreshold, 10) || 10,
                    safetyStock: parseInt(safetyStock, 10) || 5,
                    expectedVersion: selectedInventory.version,
                },
            }).unwrap();
            setIsThresholdOpen(false);
            const msg = `Thresholds updated for variant ${selectedInventory.variantId.slice(-8)}`;
            setNotice(msg);
            toast.success(msg);
            setTimeout(() => setNotice(null), 3500);
        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error(`Thresholds update failed: ${err.message}`);
            }
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
                        onClick={() => (activeTab === "matrix" ? refetchInventory() : refetchMovements())}
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
            <Card className="p-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 shrink-0 self-end sm:self-auto">
                    <span>Show</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPage(1);
                            setMovementsPage(1);
                        }}
                        className="text-xs font-medium rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#161616] px-2 py-1 text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span>entries</span>
                </div>
            </Card>

            {/* Tab 1: Stock Matrix */}
            {activeTab === "matrix" && (
                <Card className="p-0 overflow-hidden flex flex-col border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Spinner size="md" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Loading warehouse inventory...</p>
                        </div>
                    ) : error ? (
                        <div className="p-6">
                            <ErrorState title="Failed to load inventory" message={error} onRetry={() => refetchInventory()} />
                        </div>
                    ) : (
                        <>
                            <Table className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px] border-none rounded-none">
                                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs shadow-xs">
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

                            {totalItems > 0 && (
                                <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30 shrink-0">
                                    <Pagination
                                        page={page}
                                        totalPages={totalPages}
                                        totalItems={totalItems}
                                        pageSize={pageSize}
                                        onPageChange={setPage}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </Card>
            )}

            {/* Tab 2: Movement Audit Ledger */}
            {activeTab === "movements" && (
                <Card className="p-0 overflow-hidden flex flex-col border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    {movementsLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-2">
                            <Spinner size="md" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Loading audit ledger...</p>
                        </div>
                    ) : (
                        <>
                            <Table className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px] border-none rounded-none">
                                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs shadow-xs">
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

                        {movementsTotalItems > 0 && (
                            <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30 shrink-0">
                                <Pagination
                                    page={movementsPage}
                                    totalPages={movementsTotalPages}
                                    totalItems={movementsTotalItems}
                                    pageSize={pageSize}
                                    onPageChange={setMovementsPage}
                                />
                            </div>
                        )}
                    </>
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
