"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import type { OrderResponse, OrderFulfillmentStatus } from "@ecommers/types";
import {
    Card,
    Badge,
    Spinner,
    ErrorState,
    Button,
    Input,
    FormField,
    ConfirmDialog,
} from "@ecommers/ui";
import {
    ArrowLeft,
    Truck,
    Package,
    CreditCard,
    User,
    CheckCircle2,
    XCircle,
    MapPin,
} from "lucide-react";

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [order, setOrder] = useState<OrderResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fulfillment Form State
    const [targetFulfillment, setTargetFulfillment] = useState<OrderFulfillmentStatus>("PROCESSING");
    const [carrier, setCarrier] = useState("");
    const [trackingNumber, setTrackingNumber] = useState("");
    const [isUpdatingFulfillment, setIsUpdatingFulfillment] = useState(false);
    const [fulfillmentNotice, setFulfillmentNotice] = useState<string | null>(null);

    // Cancellation State
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [isCancelling, setIsCancelling] = useState(false);

    const fetchOrder = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.orders.adminGetById(id);
            setOrder(data);
            if (data.fulfillmentStatus) {
                setTargetFulfillment(data.fulfillmentStatus);
            }
            if (data.fulfillment?.carrier) setCarrier(data.fulfillment.carrier);
            if (data.fulfillment?.trackingNumber) setTrackingNumber(data.fulfillment.trackingNumber);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to fetch order details.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchOrder();
        }
    }, [id]);

    const handleUpdateFulfillment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!order) return;
        setIsUpdatingFulfillment(true);
        setFulfillmentNotice(null);
        try {
            const updated = await api.orders.adminUpdateFulfillment(id, {
                fulfillmentStatus: targetFulfillment,
                carrier: carrier.trim() || undefined,
                trackingNumber: trackingNumber.trim() || undefined,
                expectedVersion: order.version,
            });
            setOrder(updated);
            setFulfillmentNotice(`Fulfillment updated to ${targetFulfillment}`);
            setTimeout(() => setFulfillmentNotice(null), 3000);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Error updating fulfillment: ${err.message}`);
            }
        } finally {
            setIsUpdatingFulfillment(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!order) return;
        setIsCancelling(true);
        try {
            const cancelled = await api.orders.adminCancel(id, {
                reason: cancelReason.trim() || "Administrative cancellation",
                expectedVersion: order.version,
            });
            setOrder(cancelled);
            setIsCancelDialogOpen(false);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Cancellation failed: ${err.message}`);
            }
        } finally {
            setIsCancelling(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6rem 0", gap: "1rem" }}>
                <Spinner size="lg" />
                <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading order details...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div style={{ padding: "2rem 0" }}>
                <ErrorState
                    title="Order not found"
                    message={error || "Could not retrieve the requested order."}
                    onRetry={fetchOrder}
                />
            </div>
        );
    }

    const isOrderCancelled = order.orderStatus === "CANCELLED";
    const pricing = order.pricing;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Top Navigation */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/orders")}
                    style={{ borderRadius: "8px", gap: "0.375rem" }}
                >
                    <ArrowLeft size={14} />
                    <span>Back to Orders</span>
                </Button>

                {!isOrderCancelled && (
                    <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setIsCancelDialogOpen(true)}
                        style={{ borderRadius: "8px" }}
                    >
                        <XCircle size={14} />
                        <span>Cancel Order</span>
                    </Button>
                )}
            </div>

            {/* Header Card */}
            <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>
                                {order.orderNumber}
                            </span>
                            <Badge variant={order.orderStatus === "CONFIRMED" ? "success" : order.orderStatus === "CANCELLED" ? "danger" : "warning"} size="md">
                                {order.orderStatus}
                            </Badge>
                        </div>
                        <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                            Placed on {new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <Badge variant="primary" size="md">Payment: {order.paymentStatus}</Badge>
                        <Badge variant={order.fulfillmentStatus === "DELIVERED" ? "success" : "neutral"} size="md">
                            Fulfillment: {order.fulfillmentStatus}
                        </Badge>
                    </div>
                </div>
            </Card>

            {/* Two-Column Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem" }}>
                {/* Left Column: Items & Financial Breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Line Items Card */}
                    <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Package size={18} color="#2563eb" />
                            <span>Order Items ({order.items?.length || 0})</span>
                        </h2>

                        <div style={{ display: "flex", flexDirection: "column" }}>
                            {(order.items || []).map((item, idx) => (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.875rem 0", borderBottom: "1px solid #f1f5f9" }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0f172a" }}>{item.productTitle}</div>
                                        <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#64748b", marginTop: "2px" }}>
                                            SKU: {item.sku}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a" }}>
                                            ${(item.lineTotalMinor / 100).toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                            Qty: {item.quantity} × ${(item.unitPriceMinor / 100).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Financial Totals */}
                        <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "#64748b" }}>
                                <span>Subtotal</span>
                                <span>${((pricing?.subtotalMinor || 0) / 100).toFixed(2)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "#64748b" }}>
                                <span>Shipping Fee</span>
                                <span>${((pricing?.shippingMinor || 0) / 100).toFixed(2)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "#64748b" }}>
                                <span>Tax</span>
                                <span>${((pricing?.taxMinor || 0) / 100).toFixed(2)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem", fontWeight: 800, color: "#0f172a", paddingTop: "0.5rem", borderTop: "1px solid #f1f5f9" }}>
                                <span>Grand Total</span>
                                <span style={{ color: "#2563eb" }}>
                                    ${((pricing?.grandTotalMinor || 0) / 100).toFixed(2)} ({pricing?.currency || "USD"})
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Payment Info Card */}
                    <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <CreditCard size={18} color="#2563eb" />
                            <span>Payment Information</span>
                        </h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.8125rem" }}>
                            <div>
                                <span style={{ color: "#64748b" }}>Payment Status:</span>
                                <div style={{ fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>{order.paymentStatus}</div>
                            </div>
                            <div>
                                <span style={{ color: "#64748b" }}>Currency:</span>
                                <div style={{ fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>{pricing?.currency || "USD"}</div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Customer Details & Fulfillment Action Card */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Customer Info Card */}
                    <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <User size={18} color="#2563eb" />
                            <span>Customer & Delivery Details</span>
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.8125rem" }}>
                            <div>
                                <span style={{ color: "#64748b" }}>Email:</span>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>{order.customerEmailSnapshot || "N/A"}</div>
                            </div>
                            {order.shippingAddressSnapshot && (
                                <div>
                                    <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                                        <MapPin size={13} /> Shipping Address:
                                    </span>
                                    <div style={{ fontWeight: 500, color: "#0f172a", marginTop: "2px" }}>
                                        {order.shippingAddressSnapshot.firstName} {order.shippingAddressSnapshot.lastName}<br />
                                        {order.shippingAddressSnapshot.street}<br />
                                        {order.shippingAddressSnapshot.city}, {order.shippingAddressSnapshot.state} {order.shippingAddressSnapshot.postalCode}<br />
                                        {order.shippingAddressSnapshot.country}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Fulfillment Controls Card */}
                    <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Truck size={18} color="#2563eb" />
                            <span>Fulfillment Dispatch</span>
                        </h2>
                        <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "1rem" }}>
                            Update tracking credentials and advance fulfillment state machine.
                        </p>

                        {fulfillmentNotice && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "0.75rem", marginBottom: "1rem" }}>
                                <CheckCircle2 size={14} />
                                <span>{fulfillmentNotice}</span>
                            </div>
                        )}

                        <form onSubmit={handleUpdateFulfillment} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <FormField label="Fulfillment State" required>
                                <select
                                    value={targetFulfillment}
                                    onChange={(e) => setTargetFulfillment(e.target.value as OrderFulfillmentStatus)}
                                    disabled={isOrderCancelled || isUpdatingFulfillment}
                                    style={{
                                        padding: "0.5rem 0.75rem",
                                        borderRadius: "8px",
                                        border: "1px solid #e2e8f0",
                                        backgroundColor: "#f8fafc",
                                        fontSize: "0.8125rem",
                                        color: "#0f172a",
                                        outline: "none",
                                        width: "100%",
                                    }}
                                >
                                    <option value="UNFULFILLED">UNFULFILLED</option>
                                    <option value="PROCESSING">PROCESSING</option>
                                    <option value="SHIPPED">SHIPPED</option>
                                    <option value="DELIVERED">DELIVERED</option>
                                    <option value="RETURNED">RETURNED</option>
                                </select>
                            </FormField>

                            <FormField label="Carrier (FedEx, UPS, DHL)">
                                <Input
                                    value={carrier}
                                    onChange={(e) => setCarrier(e.target.value)}
                                    placeholder="e.g. FedEx"
                                    disabled={isOrderCancelled || isUpdatingFulfillment}
                                />
                            </FormField>

                            <FormField label="Tracking Number">
                                <Input
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="e.g. TRK9847120398"
                                    disabled={isOrderCancelled || isUpdatingFulfillment}
                                />
                            </FormField>

                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={isUpdatingFulfillment}
                                disabled={isOrderCancelled || isUpdatingFulfillment}
                                style={{ backgroundColor: "#2563eb", borderRadius: "8px" }}
                            >
                                Update Fulfillment
                            </Button>
                        </form>
                    </Card>
                </div>
            </div>

            {/* Cancel Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isCancelDialogOpen}
                onClose={() => !isCancelling && setIsCancelDialogOpen(false)}
                onConfirm={handleCancelOrder}
                title="Cancel Customer Order"
                description="Are you sure you want to cancel this order? This action will mark the order as cancelled and initiate an inventory reversal."
                confirmLabel={isCancelling ? "Cancelling..." : "Confirm Cancellation"}
                variant="danger"
            />
        </div>
    );
}
