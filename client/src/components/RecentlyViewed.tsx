"use client"
import { useEffect, useState } from "react"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import ProductCard from "@/components/ProductCard"
import { getRecentlyViewed, RecentlyViewedItem } from "@/lib/recentlyViewed"

export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([])

  useEffect(() => {
    setItems(getRecentlyViewed())
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<RecentlyViewedItem[]>).detail
      if (Array.isArray(detail)) setItems(detail)
    }
    window.addEventListener("recently-viewed-updated", handler as EventListener)
    return () => window.removeEventListener("recently-viewed-updated", handler as EventListener)
  }, [])

  if (!items || items.length === 0) return null

  return (
    <div className="mt-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Recently Viewed</h2>
          </div>
        </div>
        <Carousel opts={{ loop: true, align: "start" }} className="relative">
          <CarouselContent>
            {items.map((p) => (
              <CarouselItem key={p.id} className="basis-3/4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                <ProductCard
                  id={p.id}
                  title={p.title}
                  description={""}
                  price={Number(p.price)}
                  discountedPrice={p.discountedPrice != null ? Number(p.discountedPrice) : undefined}
                  image={p.image}
                  district={p.district}
                  giBrand={p.giBrand}
                  vendorName={p.vendorName || ""}
                  storeId={p.storeId}
                  stock={Number(p.stock || 0)}
                  ratingAverage={0}
                  ratingCount={0}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2 sm:-left-2 z-10" />
          <CarouselNext className="right-2 sm:-right-2 z-10" />
        </Carousel>
      </div>
    </div>
  )
}
