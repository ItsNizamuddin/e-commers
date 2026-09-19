import { describe, it, expect } from "vitest";
import { convertUnits, areUnitsCompatible } from "./unit-conversion.js";

describe("unit-conversion", () => {
    it("converts mass units correctly", () => {
        expect(convertUnits(500, "g", "kg")).toBe(0.5);
        expect(convertUnits(1.5, "kg", "g")).toBe(1500);
        expect(convertUnits(10, "kg", "kg")).toBe(10);
    });

    it("converts volume units correctly", () => {
        expect(convertUnits(250, "ml", "l")).toBe(0.25);
        expect(convertUnits(2, "l", "ml")).toBe(2000);
    });

    it("converts cross-dimensional mass to volume with food density", () => {
        // 500g of liquid (density 1.0) = 0.5 Liters
        expect(convertUnits(500, "g", "l")).toBe(0.5);
        // 1.5 kg of liquid = 1.5 Liters
        expect(convertUnits(1.5, "kg", "l")).toBe(1.5);
        // 250 g = 250 ml
        expect(convertUnits(250, "g", "ml")).toBe(250);
    });

    it("converts cross-dimensional volume to mass with food density", () => {
        // 1 Liter of liquid = 1 kg
        expect(convertUnits(1, "l", "kg")).toBe(1);
        // 500 ml of liquid = 500 g
        expect(convertUnits(500, "ml", "g")).toBe(500);
        // 0.75 Liter = 750 g
        expect(convertUnits(0.75, "l", "g")).toBe(750);
    });

    it("areUnitsCompatible returns true for cross-dimensional food conversions", () => {
        expect(areUnitsCompatible("g", "l")).toBe(true);
        expect(areUnitsCompatible("kg", "ml")).toBe(true);
        expect(areUnitsCompatible("l", "g")).toBe(true);
        expect(areUnitsCompatible("pcs", "g")).toBe(false);
    });
});
