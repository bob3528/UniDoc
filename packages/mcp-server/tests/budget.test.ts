// ============================================================
// Budget Engine Tests
// ============================================================

import { describe, it, expect } from "vitest";
import { calculateBudget, validateBudget, suggestBudgetAdjustments } from "../src/engine/budget-engine.js";
import { sampleEventDetails } from "./test-data.js";

describe("calculateBudget", () => {
  it("should calculate item totals correctly", () => {
    const result = calculateBudget([
      { category: "Food", description: "Lunch", quantity: 10, unitPrice: 15 },
      { category: "Food", description: "Snacks", quantity: 20, unitPrice: 5 },
    ]);

    expect(result.items).toHaveLength(2);
    expect(result.items[0].total).toBe(150);
    expect(result.items[1].total).toBe(100);
    expect(result.totalExpenditure).toBe(250);
  });

  it("should detect budget overrun", () => {
    const result = calculateBudget(
      [{ category: "Test", description: "Item", quantity: 5, unitPrice: 1200 }],
      5000,
    );

    expect(result.totalExpenditure).toBe(6000);
    expect(result.overrun).toBe(1000);
    expect(result.remaining).toBeUndefined();
  });

  it("should calculate remaining budget", () => {
    const result = calculateBudget(
      [{ category: "Test", description: "Item", quantity: 2, unitPrice: 500 }],
      5000,
    );

    expect(result.totalExpenditure).toBe(1000);
    expect(result.remaining).toBe(4000);
    expect(result.overrun).toBeUndefined();
  });

  it("should handle decimal prices", () => {
    const result = calculateBudget([
      { category: "Test", description: "Item", quantity: 3, unitPrice: 12.50 },
    ]);

    expect(result.items[0].total).toBe(37.5);
    expect(result.totalExpenditure).toBe(37.5);
  });
});

describe("validateBudget", () => {
  it("should detect arithmetic errors when total is provided", () => {
    const result = validateBudget([
      { category: "Food", description: "Lunch", quantity: 10, unitPrice: 15, total: 200 },
    ]);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe("error");
    expect(result.issues[0].message).toContain("should be RM150.00");
    expect(result.status).toBe("fail");
  });

  it("should pass with correct calculations", () => {
    const result = validateBudget(sampleEventDetails.budget, sampleEventDetails.budgetLimit);

    const errors = result.issues.filter((i) => i.severity === "error");
    // Budget exceeds 5000 limit
    expect(errors.length).toBeGreaterThan(0);
    const overrunError = errors.find((e) => e.message.includes("overrun"));
    expect(overrunError).toBeDefined();
  });

  it("should warn about high unit prices", () => {
    const result = validateBudget([
      { category: "Honorarium", description: "Speaker fee", quantity: 1, unitPrice: 15000 },
    ]);

    const warnings = result.issues.filter((i) => i.severity === "warning");
    expect(warnings.some((w) => w.message.includes("high unit price"))).toBe(true);
  });

  it("should warn about duplicate items", () => {
    const result = validateBudget([
      { category: "Food", description: "Lunch", quantity: 10, unitPrice: 15 },
      { category: "Food", description: "lunch", quantity: 5, unitPrice: 15 },
    ]);

    const dupWarning = result.issues.find((i) => i.message.includes("Duplicate"));
    expect(dupWarning).toBeDefined();
  });

  it("should pass for valid budget without limit", () => {
    const result = validateBudget([
      { category: "Food", description: "Lunch", quantity: 10, unitPrice: 15 },
    ]);

    expect(result.status).toBe("pass");
    expect(result.issues).toHaveLength(0);
  });
});

describe("suggestBudgetAdjustments", () => {
  it("should suggest reducing high-cost items first", () => {
    const items = [
      { category: "Food", description: "Lunch", quantity: 100, unitPrice: 15, total: 1500 },
      { category: "Speaker", description: "Honorarium", quantity: 1, unitPrice: 5000, total: 5000 },
    ];

    const result = suggestBudgetAdjustments(items, 5000);

    expect(result.currentTotal).toBe(6500);
    expect(result.requiredReduction).toBe(1500);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("should return empty suggestions when within budget", () => {
    const items = [
      { category: "Food", description: "Lunch", quantity: 10, unitPrice: 15, total: 150 },
    ];

    const result = suggestBudgetAdjustments(items, 5000);

    expect(result.requiredReduction).toBe(0);
    expect(result.suggestions).toHaveLength(0);
  });
});
