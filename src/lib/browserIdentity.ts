const appTitle = 'App Control'
const browserAssetVersion = 'app-control-20260521'

type LinkDescriptor = {
  selector: string
  rel: string
  href: string
  sizes?: string
  type?: string
}

const appControlLinks: LinkDescriptor[] = [
  {
    selector: 'link[rel="icon"][sizes="32x32"]',
    rel: 'icon',
    type: 'image/png',
    sizes: '32x32',
    href: `/icons/favicon-32.png?v=${browserAssetVersion}`,
  },
  {
    selector: 'link[rel="icon"][sizes="16x16"]',
    rel: 'icon',
    type: 'image/png',
    sizes: '16x16',
    href: `/icons/favicon-16.png?v=${browserAssetVersion}`,
  },
  {
    selector: 'link[rel="apple-touch-icon"]',
    rel: 'apple-touch-icon',
    sizes: '180x180',
    href: `/icons/apple-touch-icon.png?v=${browserAssetVersion}`,
  },
  {
    selector: 'link[rel="manifest"]',
    rel: 'manifest',
    href: `/manifest.webmanifest?v=${browserAssetVersion}`,
  },
]

export function enforceAppControlBrowserIdentity() {
  if (typeof document !== 'undefined') {
    document.title = appTitle
    appControlLinks.forEach(upsertHeadLink)
  }

  if (isLocalDevelopmentOrigin()) {
    void clearLocalOriginPwaCache()
  }
}

function upsertHeadLink(linkDescriptor: LinkDescriptor) {
  const link = document.querySelector<HTMLLinkElement>(linkDescriptor.selector) ?? document.createElement('link')
  link.rel = linkDescriptor.rel
  link.href = linkDescriptor.href

  if (linkDescriptor.type) {
    link.type = linkDescriptor.type
  } else {
    link.removeAttribute('type')
  }

  if (linkDescriptor.sizes) {
    link.sizes = linkDescriptor.sizes
  } else {
    link.removeAttribute('sizes')
  }

  if (!link.parentNode) {
    document.head.appendChild(link)
  }
}

function isLocalDevelopmentOrigin() {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

async function clearLocalOriginPwaCache() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }

    if ('caches' in window) {
      const cacheNames = await window.caches.keys()
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)))
    }
  } catch {
    // Best effort only: stale local PWA cleanup must never block app startup.
  }
}
