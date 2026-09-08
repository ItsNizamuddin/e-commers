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
    Select,
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
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Spinner size="lg" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading order details...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="py-8">
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
        <div className="flex flex-col gap-6">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/orders")}
                    className="gap-1.5"
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
                        className="gap-1.5"
                    >
                        <XCircle size={14} />
                        <span>Cancel Order</span>
                    </Button>
                )}
            </div>

            {/* Header Card */}
            <Card className="p-4">
                <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                                {order.orderNumber}
                            </span>
                            <Badge variant={order.orderStatus === "CONFIRMED" ? "success" : order.orderStatus === "CANCELLED" ? "danger" : "warning"} size="sm">
                                {order.orderStatus}
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                            Placed on {new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Badge variant="primary" size="sm">Payment: {order.paymentStatus}</Badge>
                        <Badge variant={order.fulfillmentStatus === "DELIVERED" ? "success" : "neutral"} size="sm">
                            Fulfillment: {order.fulfillmentStatus}
                        </Badge>
                    </div>
                </div>
            </Card>

            {/* Two-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column: Items & Financial Breakdown */}
                <div className="flex flex-col gap-4">
                    {/* Line Items Card */}
                    <Card className="p-4">
                        <h2 className="text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <Package size={15} className="text-blue-600 dark:text-blue-400" />
                            <span>Order Items ({order.items?.length || 0})</span>
                        </h2>

                        <div className="flex flex-col divide-y divide-slate-100 dark:divide-neutral-800">
                            {(order.items || []).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center py-2.5">
                                    <div>
                                        <div className="font-semibold text-xs text-slate-900 dark:text-white">{item.productTitle}</div>
                                        <div className="text-[11px] font-mono text-slate-400 dark:text-neutral-500">
                                            SKU: {item.sku}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            ${(item.lineTotalMinor / 100).toFixed(2)}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                                            Qty: {item.quantity} × ${(item.unitPriceMinor / 100).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Financial Totals */}
                        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-neutral-800 flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs text-slate-500 dark:text-neutral-400">
                                <span>Subtotal</span>
                                <span>${((pricing?.subtotalMinor || 0) / 100).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 dark:text-neutral-400">
                                <span>Shipping Fee</span>
                                <span>${((pricing?.shippingMinor || 0) / 100).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 dark:text-neutral-400">
                                <span>Tax</span>
                                <span>${((pricing?.taxMinor || 0) / 100).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-neutral-800">
                                <span>Grand Total</span>
                                <span className="text-blue-600 dark:text-blue-400">
                                    ${((pricing?.grandTotalMinor || 0) / 100).toFixed(2)} ({pricing?.currency || "USD"})
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Payment Info Card */}
                    <Card className="p-4">
                        <h2 className="text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <CreditCard size={15} className="text-blue-600 dark:text-blue-400" />
                            <span>Payment Information</span>
                        </h2>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-slate-500 dark:text-neutral-400">Payment Status:</span>
                                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{order.paymentStatus}</div>
                            </div>
                            <div>
                                <span className="text-slate-500 dark:text-neutral-400">Currency:</span>
                                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{pricing?.currency || "USD"}</div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Customer Details & Fulfillment Action Card */}
                <div className="flex flex-col gap-4">
                    {/* Customer Info Card */}
                    <Card className="p-4">
                        <h2 className="text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <User size={15} className="text-blue-600 dark:text-blue-400" />
                            <span>Customer & Delivery Details</span>
                        </h2>
                        <div className="flex flex-col gap-2.5 text-xs">
                            <div>
                                <span className="text-slate-500 dark:text-neutral-400">Email:</span>
                                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{order.customerEmailSnapshot || "N/A"}</div>
                            </div>
                            {order.shippingAddressSnapshot && (
                                <div>
                                    <span className="text-slate-500 dark:text-neutral-400 flex items-center gap-1">
                                        <MapPin size={12} /> Shipping Address:
                                    </span>
                                    <div className="font-medium text-slate-800 dark:text-neutral-200 mt-0.5 leading-relaxed text-xs">
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
                    <Card className="p-4">
                        <h2 className="text-xs font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                            <Truck size={15} className="text-blue-600 dark:text-blue-400" />
                            <span>Fulfillment Dispatch</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mb-3">
                            Update tracking credentials and advance fulfillment state machine.
                        </p>

                        {fulfillmentNotice && (
                            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs mb-4">
                                <CheckCircle2 size={14} />
                                <span>{fulfillmentNotice}</span>
                            </div>
                        )}

                        <form onSubmit={handleUpdateFulfillment} className="flex flex-col gap-3">
                            <FormField label="Fulfillment State" required>
                                <Select
                                    size="md"
                                    value={targetFulfillment}
                                    onChange={(e) => setTargetFulfillment(e.target.value as OrderFulfillmentStatus)}
                                    disabled={isOrderCancelled || isUpdatingFulfillment}
                                >
                                    <option value="UNFULFILLED">UNFULFILLED</option>
                                    <option value="PROCESSING">PROCESSING</option>
                                    <option value="SHIPPED">SHIPPED</option>
                                    <option value="DELIVERED">DELIVERED</option>
                                    <option value="RETURNED">RETURNED</option>
                                </Select>
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
                                className="w-full mt-2"
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
