import { useEffect, useState } from 'react'

export function useIsMobileViewport(breakpoint = 980) {
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia(`(max-width: ${breakpoint}px)`).matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [breakpoint])

  return isMobileViewport
}
