import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("単純な行をエスケープなしで結合", () => {
    expect(toCsv([["a", "b"], [1, 2]])).toBe("a,b\r\n1,2");
  });

  it("カンマを含むセルはダブルクォートで囲む", () => {
    expect(toCsv([["a,b", "c"]])).toBe('"a,b",c');
  });

  it('ダブルクォートはエスケープされる', () => {
    expect(toCsv([['he said "hi"']])).toBe('"he said ""hi"""');
  });

  it("改行を含むセルもダブルクォート", () => {
    expect(toCsv([["line1\nline2"]])).toBe('"line1\nline2"');
  });

  it("null / undefined は空セル", () => {
    expect(toCsv([[null, undefined, "x"]])).toBe(",,x");
  });
});
