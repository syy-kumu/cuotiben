/**
 * 自己写的 Service Worker —— 不依赖 workbox，避免它的构建工具链问题。
 *
 * 策略：
 *  - 静态资源（HTML/JS/CSS/图片）：安装时预缓存，之后 cache-first（秒开，离线可用）
 *  - /api/ 与 DeepSeek 域名：直连网络，绝不缓存（AI 结果必须实时）
 *  - 版本号在每次构建时更新 → 自动淘汰旧缓存
 */

const VERSION = 'mvrydod6'
const CACHE = `cuotiben-${VERSION}`

// 构建后由脚本注入要预缓存的文件列表
const PRECACHE = ["./apple-touch-icon.png","./assets/index-DJEEEXMx.js","./assets/index-DPQV7UVH.css","./assets/KaTeX_AMS-Regular-BQhdFMY1.woff2","./assets/KaTeX_AMS-Regular-DMm9YOAa.woff","./assets/KaTeX_Caligraphic-Bold-BEiXGLvX.woff","./assets/KaTeX_Caligraphic-Bold-Dq_IR9rO.woff2","./assets/KaTeX_Caligraphic-Regular-CTRA-rTL.woff","./assets/KaTeX_Caligraphic-Regular-Di6jR-x-.woff2","./assets/KaTeX_Fraktur-Bold-BsDP51OF.woff","./assets/KaTeX_Fraktur-Bold-CL6g_b3V.woff2","./assets/KaTeX_Fraktur-Regular-CTYiF6lA.woff2","./assets/KaTeX_Fraktur-Regular-Dxdc4cR9.woff","./assets/KaTeX_Main-Bold-Cx986IdX.woff2","./assets/KaTeX_Main-Bold-Jm3AIy58.woff","./assets/KaTeX_Main-BoldItalic-DxDJ3AOS.woff2","./assets/KaTeX_Main-BoldItalic-SpSLRI95.woff","./assets/KaTeX_Main-Italic-BMLOBm91.woff","./assets/KaTeX_Main-Italic-NWA7e6Wa.woff2","./assets/KaTeX_Main-Regular-B22Nviop.woff2","./assets/KaTeX_Main-Regular-Dr94JaBh.woff","./assets/KaTeX_Math-BoldItalic-CZnvNsCZ.woff2","./assets/KaTeX_Math-BoldItalic-iY-2wyZ7.woff","./assets/KaTeX_Math-Italic-DA0__PXp.woff","./assets/KaTeX_Math-Italic-t53AETM-.woff2","./assets/KaTeX_SansSerif-Bold-D1sUS0GD.woff2","./assets/KaTeX_SansSerif-Bold-DbIhKOiC.woff","./assets/KaTeX_SansSerif-Italic-C3H0VqGB.woff2","./assets/KaTeX_SansSerif-Italic-DN2j7dab.woff","./assets/KaTeX_SansSerif-Regular-CS6fqUqJ.woff","./assets/KaTeX_SansSerif-Regular-DDBCnlJ7.woff2","./assets/KaTeX_Script-Regular-D3wIWfF6.woff2","./assets/KaTeX_Script-Regular-D5yQViql.woff","./assets/KaTeX_Size1-Regular-C195tn64.woff","./assets/KaTeX_Size1-Regular-mCD8mA8B.woff2","./assets/KaTeX_Size2-Regular-Dy4dx90m.woff2","./assets/KaTeX_Size2-Regular-oD1tc_U0.woff","./assets/KaTeX_Size3-Regular-CTq5MqoE.woff","./assets/KaTeX_Size4-Regular-BF-4gkZK.woff","./assets/KaTeX_Size4-Regular-Dl5lxZxV.woff2","./assets/KaTeX_Typewriter-Regular-C0xS9mPB.woff","./assets/KaTeX_Typewriter-Regular-CO6r4hn1.woff2","./favicon.svg","./icons/icon-192.png","./icons/icon-512-maskable.png","./icons/icon-512.png","./index.html","./sw.js"]

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
