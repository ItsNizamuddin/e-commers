import { publicInventoryController } from "./public-inventory.controller.js";
import { adminInventoryController } from "./admin-inventory.controller.js";
import { reservationController } from "./reservation.controller.js";
import { stockMovementController } from "./stock-movement.controller.js";

export * from "./public-inventory.controller.js";
export * from "./admin-inventory.controller.js";
export * from "./reservation.controller.js";
export * from "./stock-movement.controller.js";

export class InventoryController {
    getVariantAvailability = publicInventoryController.getVariantAvailability;
    listInventory = adminInventoryController.listInventory;
    getInventoryById = adminInventoryController.getInventoryById;
    adjustInventory = adminInventoryController.adjustInventory;
    updateThresholds = adminInventoryController.updateThresholds;
    listMovements = stockMovementController.listMovements;
    getMovementById = stockMovementController.getMovementById;
    createReservation = reservationController.createReservation;
    releaseReservation = reservationController.releaseReservation;
    commitReservation = reservationController.commitReservation;
}

export const inventoryController = new InventoryController();
