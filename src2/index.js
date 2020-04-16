import {install} from './install'
import {History} from './history'

export default class VueRouter {
	constructor (options) {
		this.history = new History(this)
	}
	init (component) {
		this.rootComponent = component
		this.history.transitionTo(this.history.getHash(), this.history.setupListeners)
		this.history.listen(route => { // route = 要跳转的路由对象
			this.rootComponent._route = route
		})
	}
	push (location) {
		this.history.push(location)
	}
	replace (location) {
		this.history.replace()
	}
	// 匹配到路由
	match (location, current) {
		if (location.path === current.path) {
			return current
		}
		const route = {
			path: location.path,
			query: location.query
		}
		return route
	}

}
VueRouter.install = install
