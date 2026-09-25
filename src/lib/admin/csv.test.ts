import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("admin CSV", () => {
  it("quotes commas, quotes and new lines", () => {
    expect(csvCell('Sara "S", Ali')).toBe('"Sara ""S"", Ali"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });
  it("never lets a cell run as a formula", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+971500000000")).toBe("'+971500000000");
    expect(csvCell("@x")).toBe("'@x");
  });
  it("builds a UTF-8 file with a header row", () => {
    expect(toCsv(["Name"], [["Omar"]])).toBe("﻿Name\r\nOmar\r\n");
  });
});
