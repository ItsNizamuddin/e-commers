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
} from "@ecommers/ui";
import {
    Warehouse,
    Search,
    RefreshCw,
    Sliders,
    Layers,
    CheckCircle2,
} from "lucide-react";

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
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                            style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "#eff6ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#2563eb",
                            }}
                        >
                            <Warehouse size={18} />
                        </div>
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                            Inventory Matrix & Movements
                        </h1>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                        Monitor real-time warehouse stock, track immutable movements, and configure buffer thresholds.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => (activeTab === "matrix" ? fetchInventory(true) : fetchMovements())}
                        isLoading={refreshing || movementsLoading}
                        style={{ borderRadius: "8px" }}
                    >
                        <RefreshCw size={14} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {notice && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "0.875rem" }}>
                    <CheckCircle2 size={16} />
                    <span>{notice}</span>
                </div>
            )}

            {/* Tabs Navigation Card */}
            <Card style={{ padding: "0.5rem", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab("matrix")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem 1rem",
                            borderRadius: "8px",
                            border: "none",
                            backgroundColor: activeTab === "matrix" ? "#eff6ff" : "transparent",
                            color: activeTab === "matrix" ? "#2563eb" : "#64748b",
                            fontWeight: activeTab === "matrix" ? 700 : 500,
                            fontSize: "0.8125rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                        }}
                    >
                        <Warehouse size={16} />
                        <span>Stock Matrix</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("movements")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem 1rem",
                            borderRadius: "8px",
                            border: "none",
                            backgroundColor: activeTab === "movements" ? "#eff6ff" : "transparent",
                            color: activeTab === "movements" ? "#2563eb" : "#64748b",
                            fontWeight: activeTab === "movements" ? 700 : 500,
                            fontSize: "0.8125rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                        }}
                    >
                        <Layers size={16} />
                        <span>Movement Audit Ledger</span>
                    </button>
                </div>
            </Card>

            {/* Tab 1: Stock Matrix */}
            {activeTab === "matrix" && (
                <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
                    {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 0", gap: "1rem" }}>
                            <Spinner size="md" />
                            <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading warehouse inventory...</p>
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
                                        <TableHead style={{ textAlign: "right" }}>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} style={{ textAlign: "center", color: "#64748b", padding: "3rem 0" }}>
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
                                                            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#2563eb" }}>
                                                                {it.id.slice(-8).toUpperCase()}
                                                            </span>
                                                            <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>
                                                                Variant: {it.variantId.slice(-8)}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell style={{ fontWeight: 700, color: isOut ? "#dc2626" : isLow ? "#d97706" : "#0f172a" }}>
                                                        {it.onHand}
                                                    </TableCell>
                                                    <TableCell style={{ color: "#64748b" }}>{it.reserved}</TableCell>
                                                    <TableCell style={{ fontWeight: 700, color: "#16a34a" }}>
                                                        {available}
                                                    </TableCell>
                                                    <TableCell style={{ color: "#64748b" }}>{it.reorderThreshold}</TableCell>
                                                    <TableCell style={{ color: "#64748b" }}>{it.safetyStock}</TableCell>
                                                    <TableCell>
                                                        {isOut ? (
                                                            <Badge variant="danger" size="sm">OUT OF STOCK</Badge>
                                                        ) : isLow ? (
                                                            <Badge variant="warning" size="sm">LOW STOCK</Badge>
                                                        ) : (
                                                            <Badge variant="success" size="sm">HEALTHY</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell style={{ textAlign: "right" }}>
                                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.375rem" }}>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openAdjust(it)}
                                                                style={{ borderRadius: "6px", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                                            >
                                                                Adjust
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openThresholds(it)}
                                                                style={{ borderRadius: "6px", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                                            >
                                                                <Sliders size={13} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>

                            {totalPages > 1 && (
                                <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
                                    <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
                                </div>
                            )}
                        </>
                    )}
                </Card>
            )}

            {/* Tab 2: Movement Audit Ledger */}
            {activeTab === "movements" && (
                <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
                    {movementsLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 0", gap: "1rem" }}>
                            <Spinner size="md" />
                            <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading audit ledger...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Variant ID</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Delta</TableHead>
                                    <TableHead>On-Hand (Prev $\to$ New)</TableHead>
                                    <TableHead>Reason</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "3rem 0" }}>
                                            No stock movement logs recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    movements.map((m) => (
                                        <TableRow key={m.id}>
                                            <TableCell style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                {new Date(m.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "medium" })}
                                            </TableCell>
                                            <TableCell>
                                                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                                                    {m.variantId.slice(-8)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="neutral" size="sm">{m.type}</Badge>
                                            </TableCell>
                                            <TableCell style={{ fontWeight: 700, color: m.quantityDelta >= 0 ? "#16a34a" : "#dc2626" }}>
                                                {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                                            </TableCell>
                                            <TableCell style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                                {m.previousOnHand} $\to$ {m.newOnHand}
                                            </TableCell>
                                            <TableCell style={{ color: "#475569", fontSize: "0.8125rem" }}>
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
                <form onSubmit={handleAdjustSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                        <Button type="button" variant="secondary" onClick={() => setIsAdjustOpen(false)} disabled={isAdjusting}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" isLoading={isAdjusting} disabled={isAdjusting} style={{ backgroundColor: "#2563eb" }}>
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
                <form onSubmit={handleThresholdsSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                        <Button type="button" variant="secondary" onClick={() => setIsThresholdOpen(false)} disabled={isSavingThresholds}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" isLoading={isSavingThresholds} disabled={isSavingThresholds} style={{ backgroundColor: "#2563eb" }}>
                            Save Thresholds
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
