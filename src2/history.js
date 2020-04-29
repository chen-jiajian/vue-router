export class History {
  constructor(router, base) {
    this.router = router
    this.base = '/' + base
    this.current = {
      path: '/',
      query: {}
    }
  }
  supportsPushState() {
    return (
      typeof window !== 'undefined' &&
      (function() {
        const ua = window.navigator.userAgent

        if (
          (ua.indexOf('Android 2.') !== -1 ||
            ua.indexOf('Android 4.0') !== -1) &&
          ua.indexOf('Mobile Safari') !== -1 &&
          ua.indexOf('Chrome') === -1 &&
          ua.indexOf('Windows Phone') === -1
        ) {
          return false
        }

        return window.history && 'pushState' in window.history
      })()
    )
  }
  cb() {}
  transitionTo(location, onComplete) {
    console.log('location', location)
    const route = this.router.match(location, this.current) // 得到即将跳转的路由对象 [name, meta, path, hash,query, params, fullPath, matcched]
    this.current = route // 切换当前路由
    onComplete && onComplete(route) // 回调函数
    this.ensureURL() //
    this.cb(route)
  }
  listen(cb) {
    this.cb = cb
  }
  ensureURL(push) {
    // 改变url
    const current = this.current.fullPath // 当前链接hash
    console.log('当前链接:', this.current)
    // if (this.getHash() !== current) {
    //   push ? this.pushHash(current) : this.replaceHash(current)
    // }
  }
  setupListeners() {
    window.addEventListener('hashchange', () => {
      this.transitionTo(getHash(), route => {
        this.replaceHash(route.fullPath)
      })
    })
  }
  push(location) {
    this.transitionTo(location, route => {
      console.log('locationlocationlocation:', location)
      console.log('base:', this.base)
      this.pushHash(this.base + route.path)
    })
  }
  replace(location) {
    this.transitionTo(location, function(route) {
      this.replaceHash(route.path)
    })
  }
  pushHash(path) {
    if (this.supportsPushState) {
      console.log('---------pushState-----------', path)
      window.history.pushState({ key: Date.toString() }, '', path)
    } else {
      console.log('---------hash赋值-----------')
      window.location.hash = path
    }
  }
  replaceHash(path) {
    window.location.replace(this.getUrl(path))
  }
  // 得到替换的url
  getUrl(path) {
    const base = window.location.href.indexOf('#')[0]
    return `${base}#${path}`
  }
  // 获取hash
  getHash() {
    let href = window.location.href
    const index = href.indexOf('#')
    if (index < 0) return ''

    href = href.slice(index + 1) // 截取hash
    return href
  }
}
