export class History {
    constructor (router, base) {
        this.router = router
        this.current = {
            path: '/',
            query: {}
        }
    }
    cb () {}
    transitionTo (location, onComplete) {
        console.log('location', location)
        const route = this.router.match(location, this.current) // 得到即将跳转的路由对象 [name, meta, path, hash,query, params, fullPath, matcched]
        this.current = route // 切换当前路由
        onComplete && onComplete(route) // 回调函数
        this.ensureURL() //
        this.cb(route)
    }
    listen (cb) {
        this.cb = cb
    }
    ensureURL (push?: boolean) { // 改变url
        const current = this.current.fullPath // 当前链接hash
        console.log('当前链接:', this.current)
        // if (this.getHash() !== current) {
        //     push ? this.pushHash(current) : this.replaceHash(current)
        // }
    }
    setupListeners () {
        window.addEventListener('hashchange', () => {
            this.transitionTo(getHash(), route => {
                this.replaceHash(route.fullPath)
            })
        })
    }
    push (location) {
        this.transitionTo(location, function (route) {
            this.pushHash(route.fullPath)
        })
    }
    replace (location) {
        this.transitionTo(location, function (route) {
            this.replaceHash(route.fullPath)
        })
    }
	pushHash (path) {
        if (supportsPushState) {
            pushState(this.getUrl(path))
        } else {
            window.location.hash = path
        }
	}
	replaceHash (path) {
		window.location.replace(this.getUrl(path))
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