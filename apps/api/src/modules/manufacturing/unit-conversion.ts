import { RawMaterialUnit } from "@ecommers/types";

/**
 * Standard Unit of Measure (UoM) Conversion Matrix
 * Supports Mass (kg, g), Volume (l, ml), and Discrete items (pcs, pack).
 */

const MASS_CONVERSIONS: Record<string, number> = {
    kg: 1000,
    g: 1,
};

const VOLUME_CONVERSIONS: Record<string, number> = {
    l: 1000,
    ml: 1,
};

export class UnitConversionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UnitConversionError";
    }
}

/**
 * Checks if two units are compatible for conversion.
 */
export function areUnitsCompatible(fromUnit: RawMaterialUnit, toUnit: RawMaterialUnit): boolean {
    const from = fromUnit.toLowerCase();
    const to = toUnit.toLowerCase();

    if (from === to) return true;
    if (from in MASS_CONVERSIONS && to in MASS_CONVERSIONS) return true;
    if (from in VOLUME_CONVERSIONS && to in VOLUME_CONVERSIONS) return true;

    return false;
}

/**
 * Converts a quantity from one unit to another.
 * E.g., convertUnits(500, "g", "kg") => 0.5
 *       convertUnits(1.5, "kg", "g") => 1500
 *       convertUnits(250, "ml", "l") => 0.25
 */
export function convertUnits(quantity: number, fromUnit: RawMaterialUnit, toUnit: RawMaterialUnit): number {
    const from = fromUnit.toLowerCase();
    const to = toUnit.toLowerCase();

    if (from === to) {
        return quantity;
    }

    // Mass conversion
    if (from in MASS_CONVERSIONS && to in MASS_CONVERSIONS) {
        const inGrams = quantity * MASS_CONVERSIONS[from]!;
        return inGrams / MASS_CONVERSIONS[to]!;
    }

    // Volume conversion
    if (from in VOLUME_CONVERSIONS && to in VOLUME_CONVERSIONS) {
        const inMilliliters = quantity * VOLUME_CONVERSIONS[from]!;
        return inMilliliters / VOLUME_CONVERSIONS[to]!;
    }

    throw new UnitConversionError(
        `Incompatible units for conversion: cannot convert from '${fromUnit}' to '${toUnit}'.`
    );
}

/**
 * Converts quantity into the raw material's base unit.
 */
export function normalizeToBaseUnit(
    quantity: number,
    inputUnit: RawMaterialUnit,
    baseUnit: RawMaterialUnit
): number {
    return convertUnits(quantity, inputUnit, baseUnit);
}
