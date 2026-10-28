/**
 * 自己写的 Service Worker —— 不依赖 workbox，避免它的构建工具链问题。
 *
 * 策略：
 *  - 静态资源（HTML/JS/CSS/图片）：安装时预缓存，之后 cache-first（秒开，离线可用）
 *  - /api/ 与 DeepSeek 域名：直连网络，绝不缓存（AI 结果必须实时）
 *  - 版本号在每次构建时更新 → 自动淘汰旧缓存
 */

const VERSION = 'mvs6pip2'
const CACHE = `cuotiben-${VERSION}`

// 构建后由脚本注入要预缓存的文件列表
const PRECACHE = ["./app-DVIdi7iO.js","./apple-touch-icon.png","./favicon.svg","./icon-192.png","./icon-512-maskable.png","./icon-512.png","./index-BaKIW-Vt.css","./index.html","./KaTeX_AMS-Regular.woff","./KaTeX_AMS-Regular.woff2","./KaTeX_Caligraphic-Bold.woff","./KaTeX_Caligraphic-Bold.woff2","./KaTeX_Caligraphic-Regular.woff","./KaTeX_Caligraphic-Regular.woff2","./KaTeX_Fraktur-Bold.woff","./KaTeX_Fraktur-Bold.woff2","./KaTeX_Fraktur-Regular.woff","./KaTeX_Fraktur-Regular.woff2","./KaTeX_Main-Bold.woff","./KaTeX_Main-Bold.woff2","./KaTeX_Main-BoldItalic.woff","./KaTeX_Main-BoldItalic.woff2","./KaTeX_Main-Italic.woff","./KaTeX_Main-Italic.woff2","./KaTeX_Main-Regular.woff","./KaTeX_Main-Regular.woff2","./KaTeX_Math-BoldItalic.woff","./KaTeX_Math-BoldItalic.woff2","./KaTeX_Math-Italic.woff","./KaTeX_Math-Italic.woff2","./KaTeX_SansSerif-Bold.woff","./KaTeX_SansSerif-Bold.woff2","./KaTeX_SansSerif-Italic.woff","./KaTeX_SansSerif-Italic.woff2","./KaTeX_SansSerif-Regular.woff","./KaTeX_SansSerif-Regular.woff2","./KaTeX_Script-Regular.woff","./KaTeX_Script-Regular.woff2","./KaTeX_Size1-Regular.woff","./KaTeX_Size1-Regular.woff2","./KaTeX_Size2-Regular.woff","./KaTeX_Size2-Regular.woff2","./KaTeX_Size3-Regular.woff","./KaTeX_Size4-Regular.woff","./KaTeX_Size4-Regular.woff2","./KaTeX_Typewriter-Regular.woff","./KaTeX_Typewriter-Regular.woff2","./sw.js"]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // 跨域 AI 接口：永远走网络
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // 页面导航：网络优先，失败回退到缓存首页（离线可用）
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
          return res
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))),
    )
    return
  }

  // 静态资源：缓存优先
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
    }),
  )
})

// 允许页面触发立即更新
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
