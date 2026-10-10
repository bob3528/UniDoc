// ============================================================
// Budget Engine — Deterministic budget calculation & validation
// ============================================================

import type {
  BudgetItem,
  BudgetIssue,
  BudgetSummary,
  BudgetValidationResult,
} from "@unidoc/shared";

/**
 * Calculate individual item totals and overall expenditure.
 * If total is provided, use it; otherwise compute quantity * unitPrice.
 */
export function calculateBudget(
  items: Array<{ category: string; description: string; quantity: number; unitPrice: number }>,
  budgetLimit?: number,
): BudgetSummary {
  const computedItems: BudgetItem[] = items.map((item) => ({
    ...item,
    total: Math.round(item.quantity * item.unitPrice * 100) / 100,
  }));

  const totalExpenditure = Math.round(
    computedItems.reduce((sum, item) => sum + item.total, 0) * 100,
  ) / 100;

  const summary: BudgetSummary = {
    items: computedItems,
    totalExpenditure,
  };

  if (budgetLimit !== undefined) {
    summary.budgetLimit = budgetLimit;
    if (totalExpenditure > budgetLimit) {
      summary.overrun = Math.round((totalExpenditure - budgetLimit) * 100) / 100;
    } else {
      summary.remaining = Math.round((budgetLimit - totalExpenditure) * 100) / 100;
    }
  }

  return summary;
}

/**
 * Validate budget items for arithmetic errors, overruns, and missing data.
 */
export function validateBudget(
  items: Array<{ category: string; description: string; quantity: number; unitPrice: number; total?: number }>,
  budgetLimit?: number,
): BudgetValidationResult {
  const issues: BudgetIssue[] = [];
  const summary = calculateBudget(items, budgetLimit);

  // Check each item
  items.forEach((item, index) => {
    const expectedTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;

    // If total was provided, check for arithmetic errors
    if (item.total !== undefined) {
      const providedTotal = Math.round(item.total * 100) / 100;
      if (Math.abs(providedTotal - expectedTotal) > 0.01) {
        issues.push({
          severity: "error",
          itemIndex: index,
          category: item.category,
          message: `Budget calculation error: "${item.description}" total should be RM${expectedTotal.toFixed(2)} but was RM${providedTotal.toFixed(2)}`,
          suggestion: `Correct total to RM${expectedTotal.toFixed(2)}`,
        });
      }
    }

    // Check for zero/negative values
    if (item.quantity <= 0) {
      issues.push({
        severity: "error",
        itemIndex: index,
        category: item.category,
        message: `"${item.description}" has invalid quantity: ${item.quantity}`,
        suggestion: "Provide a positive quantity value",
      });
    }

    if (item.unitPrice < 0) {
      issues.push({
        severity: "error",
        itemIndex: index,
        category: item.category,
        message: `"${item.description}" has negative unit price: RM${item.unitPrice}`,
        suggestion: "Unit price cannot be negative",
      });
    }

    // Warn about unrealistically high unit prices
    if (item.unitPrice > 10000) {
      issues.push({
        severity: "warning",
        itemIndex: index,
        category: item.category,
        message: `"${item.description}" has a high unit price of RM${item.unitPrice.toFixed(2)}`,
        suggestion: "Verify the unit price is correct",
      });
    }
  });

  // Check for budget overrun
  if (budgetLimit !== undefined && summary.overrun) {
    issues.push({
      severity: "error",
      category: "Overall Budget",
      message: `Budget overrun: Total expenditure (RM${summary.totalExpenditure.toFixed(2)}) exceeds budget limit (RM${budgetLimit.toFixed(2)}) by RM${summary.overrun.toFixed(2)}`,
      suggestion: `Reduce costs by RM${summary.overrun.toFixed(2)} or increase budget limit. Consider reducing quantities, finding cheaper alternatives, or removing non-essential items.`,
    });
  }

  // Check for empty budget
  if (items.length === 0) {
    issues.push({
      severity: "warning",
      category: "Overall Budget",
      message: "No budget items have been provided",
      suggestion: "Add at least one budget item to the proposal",
    });
  }

  // Check for duplicate descriptions
  const seen = new Map<string, number[]>();
  items.forEach((item, index) => {
    const key = item.description.toLowerCase().trim();
    const existing = seen.get(key);
    if (existing) {
      existing.push(index);
    } else {
      seen.set(key, [index]);
    }
  });
  seen.forEach((indices) => {
    if (indices.length > 1) {
      issues.push({
        severity: "warning",
        category: "Duplicate",
        message: `Duplicate budget item "${items[indices[0]].description}" appears ${indices.length} times`,
        suggestion: "Consolidate duplicate items into a single entry",
      });
    }
  });

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const status = errorCount > 0 ? "fail" : (issues.length > 0 ? "warning" : "pass");

  return { summary, issues, status };
}

/**
 * Suggest budget adjustments to reduce expenditure to fit within a limit.
 */
export function suggestBudgetAdjustments(
  items: BudgetItem[],
  budgetLimit: number,
): {
  currentTotal: number;
  requiredReduction: number;
  suggestions: Array<{ item: BudgetItem; suggestion: string; potentialSaving: number }>;
} {
  const currentTotal = items.reduce((sum, item) => sum + item.total, 0);
  const requiredReduction = Math.max(0, currentTotal - budgetLimit);

  if (requiredReduction <= 0) {
    return {
      currentTotal,
      requiredReduction: 0,
      suggestions: [],
    };
  }

  // Suggest reducing highest-cost items first
  const sortedByCost = [...items]
    .map((item, originalIndex) => ({ ...item, originalIndex }))
    .sort((a, b) => b.total - a.total);

  const suggestions: Array<{ item: BudgetItem; suggestion: string; potentialSaving: number }> = [];

  let remainingReduction = requiredReduction;
  for (const item of sortedByCost) {
    if (remainingReduction <= 0) break;

    // Suggest reducing quantity by 1
    if (item.quantity > 1) {
      const saving = item.unitPrice;
      suggestions.push({
        item,
        suggestion: `Reduce "${item.description}" quantity from ${item.quantity} to ${item.quantity - 1} (saves RM${saving.toFixed(2)})`,
        potentialSaving: saving,
      });
      remainingReduction -= saving;
    }

    // Suggest finding a cheaper alternative
    const cheaperPrice = item.unitPrice * 0.8;
    const saving = Math.round((item.unitPrice - cheaperPrice) * item.quantity * 100) / 100;
    if (saving > 0 && remainingReduction > 0) {
      suggestions.push({
        item,
        suggestion: `Find a cheaper alternative for "${item.description}" at RM${cheaperPrice.toFixed(2)} per unit (saves RM${saving.toFixed(2)})`,
        potentialSaving: saving,
      });
      remainingReduction -= saving;
    }
  }

  return { currentTotal, requiredReduction, suggestions };
}
