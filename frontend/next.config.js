const defaultRuntimeCaching = require('next-pwa/cache')

const runtimeCaching = defaultRuntimeCaching.map((entry) => {
  if (entry?.options?.cacheName === 'apis') {
    // API payloads are auth- and company-scoped; stale cache here causes
    // "features not loading" symptoms in installed PWAs.
    return {
      ...entry,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'apis-network-only',
      },
    }
  }
  return entry
})

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
