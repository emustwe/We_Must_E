import { describe, expect, it } from "vitest";
import { formatUsd, formatUsdt, packById, PACKS, solanaPayUrl, USDT_MINT } from "./config";
import { incomingUsdt, isSignature, type SolanaTx } from "./solana-tx";

const US = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
const SENDER = "7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2";
const OTHER_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const tx = (
  pre: [string, string, number][],
  post: [string, string, number][],
  err: unknown = null,
): SolanaTx => ({
  blockTime: 1_790_000_000,
  meta: {
    err,
    preTokenBalances: pre.map(([owner, mint, amount], i) => ({
      accountIndex: i + 1,
      owner,
      mint,
      uiTokenAmount: { amount: String(amount) },
    })),
    postTokenBalances: post.map(([owner, mint, amount], i) => ({
      accountIndex: i + 1,
      owner,
      mint,
      uiTokenAmount: { amount: String(amount) },
    })),
  },
});

describe("incomingUsdt", () => {
  it("reads the USDT our wallet received, and who sent it", () => {
    const got = incomingUsdt(
      tx(
        [
          [SENDER, USDT_MINT, 90_000_000],
          [US, USDT_MINT, 5_000_000],
        ],
        [
          [SENDER, USDT_MINT, 39_986_300],
          [US, USDT_MINT, 55_013_700],
        ],
      ),
      US,
    );
    expect(got?.amountMicro).toBe(BigInt(50_013_700));
    expect(got?.from).toBe(SENDER);
    expect(got?.blockTime.toISOString()).toBe(new Date(1_790_000_000_000).toISOString());
  });

  it("counts a first deposit (no balance before)", () => {
    const got = incomingUsdt(
      tx(
        [[SENDER, USDT_MINT, 20_000_000]],
        [
          [SENDER, USDT_MINT, 0],
          [US, USDT_MINT, 20_000_000],
        ],
      ),
      US,
    );
    expect(got?.amountMicro).toBe(BigInt(20_000_000));
  });

  it("ignores failed transactions, other coins and money going out", () => {
    const pre: [string, string, number][] = [
      [SENDER, USDT_MINT, 90],
      [US, USDT_MINT, 0],
    ];
    const post: [string, string, number][] = [
      [SENDER, USDT_MINT, 40],
      [US, USDT_MINT, 50],
    ];
    expect(incomingUsdt(tx(pre, post, { InstructionError: [0, "Custom"] }), US)).toBeNull();
    expect(incomingUsdt(tx([[US, OTHER_MINT, 0]], [[US, OTHER_MINT, 50]]), US)).toBeNull();
    expect(incomingUsdt(tx([[US, USDT_MINT, 50]], [[US, USDT_MINT, 10]]), US)).toBeNull();
    expect(incomingUsdt(null, US)).toBeNull();
  });

  it("only counts the payment wallet", () => {
    expect(incomingUsdt(tx([[SENDER, USDT_MINT, 0]], [[SENDER, USDT_MINT, 50]]), US)).toBeNull();
  });
});

describe("payment helpers", () => {
  it("formats USDT with 4 decimals and USD prices", () => {
    expect(formatUsdt(50_013_700)).toBe("50.0137");
    expect(formatUsdt(BigInt(10_000_100))).toBe("10.0001");
    expect(formatUsd(4500)).toBe("$45");
    expect(formatUsd(1050)).toBe("$10.50");
  });

  it("makes a Solana Pay link with the exact amount and the USDT mint", () => {
    const url = solanaPayUrl(US, 50_013_700, "Muste E-coins");
    expect(url.startsWith(`solana:${US}?`)).toBe(true);
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("amount")).toBe("50.0137");
    expect(params.get("spl-token")).toBe(USDT_MINT);
  });

  it("finds packs by id only", () => {
    expect(packById(PACKS[0].id)).toEqual(PACKS[0]);
    expect(packById("pack-free")).toBeUndefined();
  });

  it("accepts only transaction signatures", () => {
    expect(isSignature("5".repeat(88))).toBe(true);
    expect(isSignature("0OIl".repeat(22))).toBe(false);
    expect(isSignature("short")).toBe(false);
    expect(isSignature(42)).toBe(false);
  });
});
