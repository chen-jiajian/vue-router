import { install } from './install'
import { History } from './history'
import { createMatcher } from './create-matcher'
import Regexp from 'path-to-regexp'

export default class VueRouter {
  constructor(options) {
    // console.log('options', options)
    this.options = options
    this.beforeHooks = []
    this.resolveHooks = []
    this.afterHooks = []
    this.history = new History(this, options.base)
    this.matcher = createMatcher(options.routes || [], this)
    this._routerRoot = null
  }
  init(component) {
    this._routerRoot = component
    // 有问题
    this.history.transitionTo(
      this.history.getHash(),
      this.history.setupListeners
    )
    this.history.listen(route => {
      // route = 要跳转的路由对象
      // console.log('最后更新路由：', route)
      this._routerRoot._route = route
    })
  }
  beforeEach (fn: Function): Function {
    return registerHook(this.beforeHooks, fn)
  }

  beforeResolve (fn: Function): Function {
    return registerHook(this.resolveHooks, fn)
  }

  afterEach (fn: Function): Function {
    return registerHook(this.afterHooks, fn)
  }
  push(location, onComplete) {
    this.history.push(location, onComplete)
  }
  replace(location) {
    this.history.replace()
  }
  // 匹配到路由
  match(location, current) {
    if (location.path === current.path) {
      return current
    }
    const { pathList, pathMap, nameMap } = createRouteMap(this.options.routes)
    console.log('pathMap', pathMap)
    const record = pathMap[location.path]
    console.log('我的record:', record)
    const route = {
      name: location.name || (record && record.name),
      meta: (record && record.meta) || {},
      path: location.path || '/',
      hash: location.hash || '',
      query: location.query,
      params: location.params || {},
      fullPath: location.path || '/', // getFullPath(location, stringifyQuery),
      matched: record ? [record] : []
    }
    console.log('标准match:', this.matcher.match(location, current))
    console.log('我的match:', route)
    return route // this.matcher.match(location, current)
  }
  resolve(to, current, append) {
    current = current || this.history.current
    const location = this.normalizeLocation(to, current, append, this)
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
  normalizeLocation(to, current, append) {
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
function addRouteRecord (pathList, pathMap, nameMap, route) {
  const pathToRegexpOptions = {}
  const { path, name } = route
  const record = {
    path: route.path,
    regex: compileRouteRegex(route.path, pathToRegexpOptions),
    components: route.components || { default: route.component },
    instances: {}
  }
  if (!pathMap[record.path]) {
    pathList.push(record.path)
    pathMap[record.path] = record
  }
}
// interface Regexp extends RegExp {
//   keys: Key[]
// }
function createRouteMap (routes, oldPathMap) {
  const pathMap = oldPathMap || Object.create(null)
  const pathList = []
  const nameMap = Object.create(null)
  routes.forEach(route => {
    addRouteRecord(pathList, pathMap, nameMap, route)
  })
  return {
    pathMap
  }
}
function compileRouteRegex (
  path,
  pathToRegexpOptions
) {
  const regex = Regexp(path, [], pathToRegexpOptions)
  if (process.env.NODE_ENV !== 'production') {
    const keys = Object.create(null)
    regex.keys.forEach(key => {
      keys[key.name] = true
    })
  }
  return regex
}

function createHref(base, fullPath, mode) {
  var path = mode === 'hash' ? '#' + fullPath : fullPath
  return base ? cleanPath(base + '/' + path) : path
}
function cleanPath(path) {
  return path.replace(/\/\//g, '/')
}
function registerHook (list: Array<any>, fn: Function): Function {
  list.push(fn)
  return () => {
    const i = list.indexOf(fn)
    if (i > -1) list.splice(i, 1)
  }
}

VueRouter.install = install
