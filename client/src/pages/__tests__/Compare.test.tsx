import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CompareProvider } from "@/components/CompareContext";
import Compare from "@/pages/Compare";

function renderWithProviders(items?: string[]) {
  if (items) {
    window.localStorage.setItem("compare:v1", JSON.stringify(items));
  } else {
    window.localStorage.removeItem("compare:v1");
  }

  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });

  const products = [
    {
      id: "p1",
      storeId: "s1",
      title: "Blue Pottery Vase",
      description: "Handcrafted vase",
      price: "2500",
      stock: 5,
      images: ["/img1.jpg"],
      district: "Multan",
      giBrand: "Blue Pottery",
      category: "Home Decor",
      weightKg: "1.2",
      lengthCm: "10",
      widthCm: "5",
      heightCm: "20",
      taxExempt: false,
      status: "approved",
    } as any,
    {
      id: "p2",
      storeId: "s2",
      title: "Khussa Shoes",
      description: "Handcrafted khussa",
      price: "3200",
      stock: 2,
      images: ["/img2.jpg"],
      district: "Lahore",
      giBrand: "Khussa",
      category: "Footwear",
      weightKg: "0.8",
      lengthCm: "25",
      widthCm: "8",
      heightCm: "10",
      taxExempt: true,
      status: "approved",
    } as any,
  ];

  client.setQueryData([`/api/products/p1`], products[0]);
  client.setQueryData([`/api/products/p2`], products[1]);

  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <CompareProvider>
          <Compare />
        </CompareProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("Compare page", () => {
  it("shows empty state when no products selected", () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    window.localStorage.removeItem("compare:v1");

    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <CompareProvider>
            <Compare />
          </CompareProvider>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(screen.getByText("No products selected")).toBeInTheDocument();
    expect(screen.getByText("Browse products")).toBeInTheDocument();
  });

  it("renders comparison table with attributes and badges", () => {
    renderWithProviders(["p1", "p2"]);

    expect(screen.getByText("Specifications comparison")).toBeInTheDocument();
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("District")).toBeInTheDocument();
    expect(screen.getByText("GI Brand")).toBeInTheDocument();
    expect(screen.getByText("Stock")).toBeInTheDocument();
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("Dimensions")).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();

    expect(screen.getAllByText(/Same|Differs/).length).toBeGreaterThan(0);
  });
});

