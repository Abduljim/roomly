import { describe, it, expect } from "vitest";
import { simplifyDebts, round2 } from "../src/services/settlement-core";
import { validateSplits } from "../src/services/settlement-db";
import { ApiError } from "../src/middleware/errors";

describe("simplifyDebts", () => {
  it("returns empty for no debts", () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it("passes through one-directional debt", () => {
    const result = simplifyDebts([{ from: "a", to: "b", amount: 50 }]);
    expect(result).toEqual([{ from: "a", to: "b", amount: 50 }]);
  });

  it("nets mutual debts (A owes B 50, B owes A 30 -> A owes B 20)", () => {
    const result = simplifyDebts([
      { from: "a", to: "b", amount: 50 },
      { from: "b", to: "a", amount: 30 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: "a", to: "b", amount: 20 });
  });

  it("simplifies circular debts A->B->C->A to a single transaction", () => {
    const result = simplifyDebts([
      { from: "a", to: "b", amount: 30 },
      { from: "b", to: "c", amount: 30 },
      { from: "c", to: "a", amount: 30 },
    ]);
    expect(result).toHaveLength(0); // everything nets to zero
  });

  it("reduces multiple mixed debts into minimal transactions", () => {
    // A owes B 60 (bill paid by B), B owes C 40 (bill paid by C)
    const result = simplifyDebts([
      { from: "a", to: "b", amount: 60 },
      { from: "b", to: "c", amount: 40 },
    ]);
    expect(result).toHaveLength(2); // no mutual pairs, but should be exactly 2
    const total = result.reduce((s, r) => s + r.amount, 0);
    expect(round2(total)).toBe(60); // A settles 60 total: 40 to C, 20 to B
    // Net balances preserved: A -60, B +20, C +40
    const net = (id: string) => {
      let v = 0;
      for (const r of result) {
        if (r.from === id) v -= r.amount;
        if (r.to === id) v += r.amount;
      }
      return round2(v);
    };
    expect(net("a")).toBe(-60);
    expect(net("b")).toBe(20);
    expect(net("c")).toBe(40);
  });

  it("ignores self-debts", () => {
    expect(simplifyDebts([{ from: "a", to: "a", amount: 10 }])).toEqual([]);
  });
});

describe("validateSplits", () => {
  it("accepts percentage splits summing to 100", () => {
    expect(() =>
      validateSplits(
        [
          { splitType: "percentage", splitValue: 50 },
          { splitType: "percentage", splitValue: 50 },
        ],
        1000
      )
    ).not.toThrow();
  });

  it("rejects percentage splits that do not sum to 100", () => {
    expect(() =>
      validateSplits(
        [
          { splitType: "percentage", splitValue: 40 },
          { splitType: "percentage", splitValue: 40 },
        ],
        1000
      )
    ).toThrow(ApiError);
  });

  it("rejects fixed splits that do not sum to the bill amount", () => {
    expect(() =>
      validateSplits(
        [
          { splitType: "fixed", splitValue: 300 },
          { splitType: "fixed", splitValue: 300 },
        ],
        1000
      )
    ).toThrow(/must sum to the bill amount/);
  });

  it("accepts fixed splits summing to the bill amount", () => {
    expect(() =>
      validateSplits(
        [
          { splitType: "fixed", splitValue: 700 },
          { splitType: "fixed", splitValue: 300 },
        ],
        1000
      )
    ).not.toThrow();
  });

  it("rejects empty splits", () => {
    expect(() => validateSplits([], 100)).toThrow(/at least one split/i);
  });
});
