import { install } from './install'
import { History } from './history'
import { createMatcher } from './create-matcher'

export default class VueRouter {

	constructor(options) {
		this.options = options
		this.history = new History(this)
		this.matcher = createMatcher(options.routes || [], this)
	}
	init(component) {
		this._routerRoot = component
		// 有问题
		this.history.transitionTo(this.history.getHash(), this.history.setupListeners)
		this.history.listen(route => { // route = 要跳转的路由对象
			console.log('最后更新路由：', route)
			this._routerRoot._route = route
		})
	}
	push(location) {
		this.history.push(location)
	}
	replace(location) {
		this.history.replace()
	}
	// 匹配到路由
	match(location, current) {
		if (location.path === current.path) {
			return current
		}
		// const route = {
		// 	path: location.path,
		// 	query: location.query,
		// 	matched: ''
		// }
		let record = null
		const route = {
			name: location.name || (record && record.name),
			meta: (record && record.meta) || {},
			path: location.path || '/',
			hash: location.hash || '',
			query: location.query,
			params: location.params || {},
			// fullPath: getFullPath(location, stringifyQuery),
			matched: record ? formatMatch(record) : []
		}
		return route // this.matcher.match(location, current)
	}
	resolve(to, current, append) {
		current = current || this.history.current
		const location = this.normalizeLocation(
			to,
			current,
			append,
			this
		)
		const route = this.match(location, current)
		const fullPath = route.redirectedFrom || route.fullPath
		const base = this.history.base
		const href = createHref(base, fullPath, this.mode)
		return {
			location,
			route,
			href,
			// for backwards compat
			normalizedTo: location,
			resolved: route
		}
	}
	normalizeLocation (to, current, append) {
		const path = to
		const query = {}
		let hash = ''
		if (to.indexOf('#') > -1) {
			hash = '#' + to.split('#')[1]
		}
		return {
			path,
			query,
			hash
		  }
	}

}
function createHref (base: string, fullPath: string, mode) {
	var path = mode === 'hash' ? '#' + fullPath : fullPath
	return base ? cleanPath(base + '/' + path) : path
  }
VueRouter.install = install
