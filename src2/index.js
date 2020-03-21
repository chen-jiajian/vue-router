import {install} from './install'

// hash
class HashHistory extends History {
	constructor (router, base) {
		super(router,base)

	}
	window.addEventListener('hashchange', () => {
		this.transtionTo(getHash(), route => {
			window.location.replace(getUrl(route.fullPath))

		})
	})
	cb: (r: Route) => void
	function pushHash (path) {
		window.location.hash = path
	}
	function replaceHash (path) {
		window.location.replace(getUrl(path))
	}
	function getUrl (path) {
		const base = window.location.href.indexOf('#')[0]
		return `${base}#${path}`
	}
	function transitionTo () {
		const route = VueRouter.match(location, this.current)
	}
	function updateRoute (route) {
		callback(route)
	}
	function listen (cb) {
		this.cb = cb
	}

}
// history
class HTML5History extends History {

}
export default class VueRouter {
	constructor (options) {
		let mode options.mode || 'hash'
		switch (mode) {
			case 'history':
	        	this.history = new HTML5History(this, options.base)
	        	break
	      	case 'hash':
	        	this.history = new HashHistory(this, options.base, this.fallback)
        		break
		}
	}

	init (comp) {
		this.rootComp = comp
		this.history.transtionTo(this.history.getCurrentLocation())
		this.history.listen(route => {
			this.rootComp._route = route
		})
	}
	push (location) {
		this.history.push()
	}
	replace (location) {
		this.history.replace()
	}

}
VueRouter.install = install
