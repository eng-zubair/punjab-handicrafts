import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CompareProvider, useCompare } from "@/components/CompareContext";

function setup(initialItems?: string[]) {
  if (initialItems) {
    window.localStorage.setItem("compare:v1", JSON.stringify(initialItems));
  } else {
    window.localStorage.removeItem("compare:v1");
  }
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CompareProvider>{children}</CompareProvider>
  );
  const { result } = renderHook(() => useCompare(), { wrapper });
  return result;
}

describe("CompareContext", () => {
  it("adds and removes products within max limit", () => {
    const result = setup();

    act(() => {
      result.current.add("p1");
      result.current.add("p2");
    });

    expect(result.current.items).toEqual(["p1", "p2"]);
    expect(result.current.count).toBe(2);
    expect(result.current.isCompared("p1")).toBe(true);

    act(() => {
      result.current.remove("p1");
    });

    expect(result.current.items).toEqual(["p2"]);
    expect(result.current.isCompared("p1")).toBe(false);
    expect(result.current.isCompared("p2")).toBe(true);
  });

  it("does not exceed max items when adding or toggling", () => {
    const result = setup(["a", "b", "c", "d"]);

    act(() => {
      result.current.add("e");
    });

    expect(result.current.items).toEqual(["a", "b", "c", "d"]);

    act(() => {
      result.current.toggle("e");
    });

    expect(result.current.items).toEqual(["a", "b", "c", "d"]);
  });

  it("clears and replaces items", () => {
    const result = setup(["p1", "p2"]);

    act(() => {
      result.current.clear();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);

    act(() => {
      result.current.replace(["x", "y", "z", "x"]);
    });

    expect(result.current.items).toEqual(["x", "y", "z"]);
    expect(result.current.count).toBe(3);
  });

  it("loads initial items from localStorage", () => {
    const result = setup(["p1", "p2"]);
    expect(result.current.items).toEqual(["p1", "p2"]);
    expect(result.current.count).toBe(2);
  });
});

