import { Types } from "mongoose";

/**
 * Standard default warehouse ObjectId used when a multi-warehouse destination
 * is not explicitly specified in single-fulfillment-center deployments.
 */
export const DEFAULT_WAREHOUSE_ID = new Types.ObjectId("000000000000000000000001");
