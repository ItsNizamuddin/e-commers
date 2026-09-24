"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    useGetAdminOrderByIdQuery,
    useUpdateOrderFulfillmentMutation,
    useCancelAdminOrderMutation,
    useShipOrderMutation,
} from "../../../../store/api";
import type { OrderFulfillmentStatus } from "@ecommers/types";
import { PackingBenchScanner } from "../../../../components/orders/packing-bench-scanner";
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
    toast,
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
    Tag,
    AlertTriangle,
} from "lucide-react";

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const {
        data: order,
        isLoading: loading,
        error: orderError,
        refetch: fetchOrder,
    } = useGetAdminOrderByIdQuery(id, { skip: !id });

    const [updateOrderFulfillment, { isLoading: isUpdatingFulfillment }] = useUpdateOrderFulfillmentMutation();
    const [shipOrder, { isLoading: isShipping }] = useShipOrderMutation();
    const [cancelAdminOrder, { isLoading: isCancelling }] = useCancelAdminOrderMutation();

    // Packing verification state
    const [packingStatus, setPackingStatus] = useState<string>("");

    // Fulfillment Form State
    const [targetFulfillment, setTargetFulfillment] = useState<OrderFulfillmentStatus>("PROCESSING");
    const [carrier, setCarrier] = useState("");
    const [trackingNumber, setTrackingNumber] = useState("");
    const [fulfillmentNotice, setFulfillmentNotice] = useState<string | null>(null);

    // Cancellation State
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");

    const hasAllocatedLots = Boolean(order?.items?.some(
        (it) => it.allocatedLots && it.allocatedLots.length > 0
    ));
    const isPackingVerified = !hasAllocatedLots || packingStatus === "VERIFIED";

    useEffect(() => {
        if (order) {
            if (order.fulfillmentStatus) {
                setTargetFulfillment(order.fulfillmentStatus);
            }
            if (order.fulfillment?.carrier) setCarrier(order.fulfillment.carrier);
            if (order.fulfillment?.trackingNumber) setTrackingNumber(order.fulfillment.trackingNumber);
        }
    }, [order]);

    const handleUpdateFulfillment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!order) return;

        if (targetFulfillment === "SHIPPED" && !isPackingVerified) {
            toast.error("Packing verification required: All FEFO allocated lots must be verified before marking SHIPPED.");
            return;
        }

        setFulfillmentNotice(null);
        try {
            await updateOrderFulfillment({
                id,
                body: {
                    fulfillmentStatus: targetFulfillment,
                    carrier: carrier.trim() || undefined,
                    trackingNumber: trackingNumber.trim() || undefined,
                    expectedVersion: order.version,
                },
            }).unwrap();
            setFulfillmentNotice(`Fulfillment updated to ${targetFulfillment}`);
            toast.success(`Fulfillment updated to ${targetFulfillment}`);
            setTimeout(() => setFulfillmentNotice(null), 3000);
        } catch (err: unknown) {
            const errData = (err as any)?.data;
            const msg = errData?.message || (err instanceof Error ? err.message : "Error updating fulfillment");
            toast.error(`Error updating fulfillment: ${msg}`);
        }
    };

    const handleDirectShip = async () => {
        if (!order) return;
        try {
            await shipOrder({
                id,
                body: {
                    expectedVersion: order.version,
                    carrier: carrier.trim() || undefined,
                    trackingNumber: trackingNumber.trim() || undefined,
                },
            }).unwrap();
            toast.success("Order dispatched and marked as SHIPPED!");
            fetchOrder();
        } catch (err: unknown) {
            const errData = (err as any)?.data;
            const msg = errData?.message || (err instanceof Error ? err.message : "Shipment dispatch blocked");
            toast.error(`Shipment blocked: ${msg}`);
        }
    };

    const handleCancelOrder = async () => {
        if (!order) return;
        try {
            await cancelAdminOrder({
                id,
                body: {
                    reason: cancelReason.trim() || "Administrative cancellation",
                    expectedVersion: order.version,
                },
            }).unwrap();
            setIsCancelDialogOpen(false);
            toast.success("Order cancelled successfully.");
        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error(`Cancellation failed: ${err.message}`);
            }
        }
    };

    const error = orderError
        ? typeof orderError === "string"
            ? orderError
            : "Failed to fetch order details."
        : null;

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

            {/* Packing Bench Scanner Section */}
            {!isOrderCancelled && hasAllocatedLots && (
                <PackingBenchScanner
                    order={order}
                    onPackingStatusChange={setPackingStatus}
                />
            )}

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
                                        {item.allocatedLots && item.allocatedLots.length > 0 && (
                                            <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                                                <span className="text-[10px] text-slate-400 font-medium">FEFO Lots:</span>
                                                {item.allocatedLots.map((lot, lIdx) => (
                                                    <Link
                                                        key={lIdx}
                                                        href={`/manufacturing/traceability?query=${encodeURIComponent(lot.lotNumber)}`}
                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono font-medium hover:underline"
                                                        title="Inspect lot traceability & recall blast radius"
                                                    >
                                                        <Tag size={10} />
                                                        <span>{lot.lotNumber} ({lot.quantity})</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
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

                        {hasAllocatedLots && !isPackingVerified && (
                            <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-xs mb-3">
                                <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold">Packing Verification Locked</span>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                                        Food safety guard active. Scan physical FEFO jars at the packing bench before marking as SHIPPED.
                                    </p>
                                </div>
                            </div>
                        )}

                        {hasAllocatedLots && isPackingVerified && order.fulfillmentStatus !== "SHIPPED" && order.fulfillmentStatus !== "DELIVERED" && (
                            <div className="flex items-start gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 text-xs mb-3">
                                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold">Packing Verified</span>
                                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                                        All allocated lots verified against FEFO assignment. Safe to dispatch.
                                    </p>
                                </div>
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
                                    <option value="SHIPPED" disabled={hasAllocatedLots && !isPackingVerified}>
                                        SHIPPED {hasAllocatedLots && !isPackingVerified ? "🔒 (Verification Required)" : ""}
                                    </option>
                                    <option value="DELIVERED">DELIVERED</option>
                                    <option value="RETURNED">RETURNED</option>
                                </Select>
                            </FormField>

                            <FormField label="Carrier (FedEx, UPS, DHL)">
                                <Input
                                    value={carrier}
                                    onChange={(e) => setCarrier(e.target.value)}
                                    placeholder="e.g. FedEx"
                                    disabled={isOrderCancelled || isUpdatingFulfillment || isShipping}
                                />
                            </FormField>

                            <FormField label="Tracking Number">
                                <Input
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="e.g. TRK9847120398"
                                    disabled={isOrderCancelled || isUpdatingFulfillment || isShipping}
                                />
                            </FormField>

                            <div className="flex flex-col gap-2 mt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    isLoading={isUpdatingFulfillment}
                                    disabled={isOrderCancelled || isUpdatingFulfillment || isShipping}
                                    className="w-full"
                                >
                                    Update Fulfillment
                                </Button>

                                {hasAllocatedLots && isPackingVerified && order.fulfillmentStatus !== "SHIPPED" && order.fulfillmentStatus !== "DELIVERED" && !isOrderCancelled && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleDirectShip}
                                        isLoading={isShipping}
                                        disabled={isUpdatingFulfillment || isShipping}
                                        className="w-full border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5"
                                    >
                                        <Truck size={14} />
                                        <span>Dispatch & Ship Order</span>
                                    </Button>
                                )}
                            </div>
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
