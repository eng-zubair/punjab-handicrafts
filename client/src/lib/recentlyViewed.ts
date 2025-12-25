export type RecentlyViewedItem = {
  id: string
  title: string
  price: number
  image: string
  district: string
  giBrand: string
  vendorName: string
  storeId?: string
  stock?: number
}

const RV_KEY = "sanatzar_recently_viewed"
const MAX_ITEMS = 20

export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(RV_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addRecentlyViewed(item: RecentlyViewedItem): RecentlyViewedItem[] {
  const list = getRecentlyViewed().filter(i => i.id !== item.id)
  const next = [item, ...list].slice(0, MAX_ITEMS)
  try {
    localStorage.setItem(RV_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent("recently-viewed-updated", { detail: next }))
  } catch {}
  return next
}
