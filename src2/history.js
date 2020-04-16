export class History {
    constructor (router, base) {
        this.router = router
        this.current = {
            path: '/',
            query: {}
        }
    }
    cb () {}
    transitionTo (location) {
        console.log('this.router', this)
        const route = this.router.match(location, this.current) // 得到即将跳转的路由对象 [name, meta, path, hash,query, params, fullPath, matcched]
        this.current = route // 切换当前路由
        this.cb(route)
    }
    listen (cb) {
        this.cb = cb
    }
    setupListeners () {
        window.addEventListener('hashchange', () => {
            this.transitionTo(getHash(), route => {
                replaceHash(route.fullPath)
            })
        })
    }
    push (location) {
        this.transitionTo(location, function (route) {
            pushHash(route.fullPath)
        })
    }
    replace (location) {
        this.transitionTo(location, function (route) {
            replaceHash(route.fullPath)
        })
    }
	pushHash (path) {
		window.location.hash = path
	}
	replaceHash (path) {
		window.location.replace(getUrl(path))
    }
    // 得到替换的url
	getUrl (path) {
		const base = window.location.href.indexOf('#')[0]
		return `${base}#${path}`
    }
    // 获取hash
    getHash () {
        let href = window.location.href
        const index = href.indexOf('#')
        if (index < 0) return ''

        href = href.slice(index + 1) // 截取hash
        return href
    }

}