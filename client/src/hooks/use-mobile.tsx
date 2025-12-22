import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    if (typeof window.matchMedia === "function") {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
      mql.addEventListener("change", onChange)
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      return () => mql.removeEventListener("change", onChange)
    } else {
      window.addEventListener("resize", onChange)
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      return () => window.removeEventListener("resize", onChange)
    }
  }, [])

  return !!isMobile
}
