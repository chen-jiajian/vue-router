#### 前言：router路由插件的使用大家都不陌生，但是在使用的使用经常会有这样的问题，比如路由通过什么来实现跳转（改变显示的组件），而且页面没有刷新呢？ 这篇文章主要分析路由的实现原理，源码分析，以及用简约的代码实现主流程


## 基本用法：
我们来看一下在项目中的基本用法
### app.vue
```
<div id="app">
  <h1>Hello App!</h1>
  <p>
    <!-- 使用 router-link 组件来导航. -->
    <!-- 通过传入 `to` 属性指定链接. -->
    <!-- <router-link> 默认会被渲染成一个 `<a>` 标签 -->
    <router-link to="/foo">Go to Foo</router-link>
    <router-link to="/bar">Go to Bar</router-link>
  </p>
  <!-- 路由出口 -->
  <!-- 路由匹配到的组件将渲染在这里 -->
  <router-view></router-view>
</div>
```
### index.js
```
import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './App'

Vue.use(VueRouter)

// 1. 定义（路由）组件。
const Foo = { template: '<div>foo</div>' }
const Bar = { template: '<div>bar</div>' }

// 2. 定义路由
const routes = [
  { path: '/foo', component: Foo },
  { path: '/bar', component: Bar }
]

// 3. 创建 router 实例，然后传 `routes` 配置
const router = new VueRouter({
  routes // （缩写）相当于 routes: routes
})

// 4. 创建和挂载根实例。
const app = new Vue({
  el: '#app',
  render(h) {
    return h(App)
  },
  router
})
```
路由的使用很简单， router-view标签作为渲染的容器，router-link标签作为路由跳转的超链接，通过to来指定路由地址，

在我们进行源码分析前，先看一下router源码的目录结构
## 目录结构


在index.js中的初始化我们可以看到，导入VueRouter的作用不仅用于new一个实例挂载进Vue的实例中，他还调用了Vue.use(VueRouter)
## Vue.use(VueRouter) 

在vue中使用插件，一般全局使用都会执行Vue.use方法，use接收一个plugin参数，调用plugin里的install方法，如果没有定义install方法，会将plugin当作方法直接执行。我们来看看router里面的install方法做了什么

### install.js

```
import View from './components/view'
import Link from './components/link'

export let _Vue

export function install (Vue) {
  // 防止重复安装
  if (install.installed && _Vue === Vue) return
  install.installed = true

  _Vue = Vue

  const isDef = v => v !== undefined // 是否定义

  // 注册实例
  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }
  // 混入生命周期
  Vue.mixin({
    beforeCreate () {
      console.log('router-beforeCreate')
      // 判断是否是根组件
      if (isDef(this.$options.router)) {
        console.log('根组件', this)
        this._routerRoot = this // 跟组件
        this._router = this.$options.router // 整个router对象
        this._router.init(this) // 初始化根组件路由
        console.log('this._router', this._router)
        // defineReactive(obj, key, val)
        // defineReactive() 就是用于定义响应式数据的工具函数，定义this._route为响应式变量，值为this._router.history.current， _route改变能触发render更新
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        // 如果不是根组件，关联根组件 this.routerRoot指向根组件
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
        // console.log('子组件：', this)
        // console.log('关联根组件：', this._routerRoot)
      }
      // 注册实例
      registerInstance(this, this)
    },
    destroyed () {
      // 销毁实例
      registerInstance(this)
    }
  })
  // 挂载变量到原型上
  Object.defineProperty(Vue.prototype, '$router', {
    get () { return this._routerRoot._router }
  })
  // 挂载变量到原型上
  Object.defineProperty(Vue.prototype, '$route', {
    get () { return this._routerRoot._route }
  })

  // 注册全局组件
  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)

  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}

```

我们看到install做了一些事情，

1.导入两个组件（router-view，router-link）并声明（后面我们再细说）

2.定义了installed防止重复安装

3.注册实例

4.mixin混入两个生命周期 *
 
    
    destroyed 销毁实例
    beforeCreate： 
    赋值_routerRoot(根组件), _router(路由对象) 
    调用router对象中的init方法初始化路由的属性，回头再说下init方法
    以及用defineReactive定义了this中的 _route属性为响应式变量，并指定初始值为history.current即为当前组件，也就是根组件
    而且 _route的变化会触发render也就是视图更新

5.挂载变量```（$router, $route）```到Vue的原型上

现在我们大概知道router插件怎么"安装"进Vue里面了，我们继续来看看Router的初始化

## new VueRouter (实例化对象)
```
constructor (options: RouterOptions = {}) {
  this.app = null // 根组件
  this.apps = [] // 根组件数组
  this.options = options // 传入的路由配置
  this.beforeHooks = [] // 钩子函数，后面说
  this.resolveHooks = []
  this.afterHooks = []
  this.matcher = createMatcher(options.routes || [], this) // 匹配路由器，

  let mode = options.mode || 'hash' // 默认模式
  // 不支持history模式时，是否回退到hash模式
  this.fallback = mode === 'history' && !supportsPushState && options.fallback !== false
  if (this.fallback) {
    mode = 'hash'
  }
  if (!inBrowser) {
    mode = 'abstract'
  }
  this.mode = mode
  // 根据模式，初始化history对象
  switch (mode) {
    case 'history':
      this.history = new HTML5History(this, options.base)
      break
    case 'hash':
      this.history = new HashHistory(this, options.base, this.fallback)
      break
    case 'abstract':
      this.history = new AbstractHistory(this, options.base)
      break
    default:
      if (process.env.NODE_ENV !== 'production') {
        assert(false, `invalid mode: ${mode}`)
      }
  }
}

```
VueRouter的构造函数，核心就是createMatcher创建了一个匹配对象，路由根据地址或者名字去显示，就是这个对象去匹配的。 还有就是根据不同的mode去实例化history对象，我们先看实例化history对象，最后回来看匹配路由的对象

这里有三种模式 history， hash， abstract

## 路由的几种模式

### html5.js
```
export class HTML5History extends History { // history和hash都继承自History
  constructor (router: Router, base: ?string) { // 接受router实例对象， base
    super(router, base)

    const expectScroll = router.options.scrollBehavior
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll) {
      setupScroll()
    }

    const initLocation = getLocation(this.base)
    // 设置监听事件
    window.addEventListener('popstate', e => {
      const current = this.current

      // Avoiding first `popstate` event dispatched in some browsers but first
      // history route not updated since async guard at the same time.
      const location = getLocation(this.base)
      if (this.current === START && location === initLocation) {
        return
      }

      this.transitionTo(location, route => { // 更新路由的过渡方法
        if (supportsScroll) {
          handleScroll(router, route, current, true)
        }
      })
    })
  }
}
```

我们看到html5.js里面的构造函数初始化了调用了父类的构造方法，然后设置了监听popstate事件，然后调用tansitionTo过渡方法去更新路由，transitionTo在父类的方法中，值得注意的是popstate事件是浏览器事件，只有前进后退时会调用的，或者调用window.history.forward 等这些history方法时也会触发。 如果手动去重写url，他是不会调用的，这也就是说history有个缺点，手动改写url时页面会重载，而hash模式不会。

再来看看hash模式的初始化
### hash.js

  ```
  export class HashHistory extends History {
    constructor (router: Router, base: ?string, fallback: boolean) {
      super(router, base)
      // check history fallback deeplinking
      if (fallback && checkFallback(this.base)) {
        return
      }
      ensureSlash() // 格式化url，加/
    }
    setupListeners () { // 设置监听
      const router = this.router
      const expectScroll = router.options.scrollBehavior
      const supportsScroll = supportsPushState && expectScroll

      if (supportsScroll) {
        setupScroll()
      }
      // 监听路由变化事件
      window.addEventListener(
        supportsPushState ? 'popstate' : 'hashchange',
        () => {
          const current = this.current
          if (!ensureSlash()) {
            return
          }
          this.transitionTo(getHash(), route => {
            if (supportsScroll) { // 是否支持滚动和pushstate
              handleScroll(this.router, route, current, true)
            }
            if (!supportsPushState) {
              replaceHash(route.fullPath) // 替换url的hash
            }
          })
        }
      )
    }
  }
  ```
我们看到hash模式和history模式基本一致，监听事件多了一个hashchange事件，我们之前说hash模式手动重写url，页面不会重载，就是因为改写url中的hash值的时候，hashchange事件能够监听到，然后就能调用路由转换的方法，这也得益于浏览器的机制，重写hash值，并不会导致页面的重新加载

我们看看这两个类继承同一个父类，看下父类的代码

### base.js

```
export class History {
  router: Router
  base: string
  current: Route
  pending: ?Route
  cb: (r: Route) => void
  ready: boolean
  readyCbs: Array<Function>
  readyErrorCbs: Array<Function>
  errorCbs: Array<Function>

  // implemented by sub-classes
  +go: (n: number) => void
  +push: (loc: RawLocation) => void
  +replace: (loc: RawLocation) => void
  +ensureURL: (push?: boolean) => void
  +getCurrentLocation: () => string

  constructor (router: Router, base: ?string) {
    this.router = router // router实例
    this.base = normalizeBase(base) // 
    // start with a route object that stands for "nowhere"
    this.current = START
    this.pending = null
    this.ready = false
    this.readyCbs = []
    this.readyErrorCbs = []
    this.errorCbs = []
  }

  listen (cb: Function) { // 设置更新路由后的回调函数，在index.js里面调用了
    this.cb = cb
  }

  onReady (cb: Function, errorCb: ?Function) {
    if (this.ready) {
      cb()
    } else {
      this.readyCbs.push(cb)
      if (errorCb) {
        this.readyErrorCbs.push(errorCb)
      }
    }
  }

  onError (errorCb: Function) {
    this.errorCbs.push(errorCb)
  }

  transitionTo (
    location: RawLocation,
    onComplete?: Function,
    onAbort?: Function
  ) {
    ...
    
  }

  confirmTransition (route: Route, onComplete: Function, onAbort?: Function) {
    ...
  }
  
  // 更新路由函数
  updateRoute (route: Route) {
    const prev = this.current
    this.current = route // 切换当前路由
    this.cb && this.cb(route) // 执行回调，这个回调是listen时设置的
    this.router.afterHooks.forEach(hook => {
      hook && hook(route, prev)
    })
  }
}
```
首先看构造函数，赋值router和base，以及初始化一些变量，接着看listen函数，这个函数在index.js中的init中被调用

```
// 监听route的变化， 更新根组件上的_route， listen函数赋值cb给this.cb， updateRoute的时候会去调用cb
history.listen(route => {
  this.apps.forEach((app) => {
    app._route = route
  })
})
```
接着看transitionTo，非常重要的一个方法

### transitionTo
```
transitionTo (
    location: RawLocation,
    onComplete?: Function,
    onAbort?: Function
  ) {
    // this.current为当前路由
    const route = this.router.match(location, this.current) // 得到即将跳转的路由对象 [name, meta, path, hash,query, params, fullPath, matcched]
    this.confirmTransition( // 确认路由
      route,
      () => { // 确认后回调
        this.updateRoute(route) // 更新路由
        onComplete && onComplete(route) // transitionTo的回调函数
        this.ensureURL() // 替换url

        // fire ready cbs once
        if (!this.ready) {
          this.ready = true
          this.readyCbs.forEach(cb => {
            cb(route) // 准备后的回调事件
          })
        }
      },
      err => {
        if (onAbort) {
          onAbort(err)
        }
        if (err && !this.ready) {
          this.ready = true
          this.readyErrorCbs.forEach(cb => {
            cb(err)
          })
        }
      }
    )
  }
```

这里调用了确认路由方法confirmTransition（判断是否同个路由等操作），确认完成在回调中执行了updateRoute去更新路由，ensureURL方法更新url。


### updateRoute

```
updateRoute (route: Route) {
  const prev = this.current
  this.current = route // 切换当前路由
  this.cb && this.cb(route) // 这个回调是listen时设置的 app._route = route
  this.router.afterHooks.forEach(hook => {
    hook && hook(route, prev)
  })
}
```
updateRoute关键就是替换当前路由，然后执行cb() 回调函数，这个回调函数是在index.js中的init方法设置的，等会下面会看到

### ensureURl
```
// hash模式：
ensureURL (push?: boolean) { // push表示push方法 或是replace方法
  const current = this.current.fullPath // 当前链接完整路径
  if (getHash() !== current) {
    push ? pushHash(current) : replaceHash(current)
  }
}
function pushHash (path) { // 改变url上的hash
  if (supportsPushState) { // 浏览器支持
    pushState(getUrl(path))
  } else {
    window.location.hash = path // 直接对hash赋值
  }
}

function replaceHash (path) {
  if (supportsPushState) {
    replaceState(getUrl(path))
  } else {
    window.location.replace(getUrl(path))
  }
}
function getUrl (path) { // 获取一个新的完整url
  const href = window.location.href
  const i = href.indexOf('#')
  const base = i >= 0 ? href.slice(0, i) : href
  return `${base}#${path}`
}
```

```
// history模式：
ensureURL (push?: boolean) {
    if (getLocation(this.base) !== this.current.fullPath) {
      const current = cleanPath(this.base + this.current.fullPath)
      push ? pushState(current) : replaceState(current)
    }
  }
}
export function pushState (url?: string, replace?: boolean) {
  saveScrollPosition()
  // try...catch the pushState call to get around Safari
  // DOM Exception 18 where it limits to 100 pushState calls
  const history = window.history
   try {
    if (replace) {
      // preserve existing history state as it could be overriden by the user
      const stateCopy = extend({}, history.state) // 克隆了history.state
      stateCopy.key = getStateKey() // 更新key
      history.replaceState(stateCopy, '', url)
    } else {
      history.pushState({ key: setStateKey(genStateKey()) }, '', url) // 按时间戳生成key
    }
  } catch (e) {
    window.location[replace ? 'replace' : 'assign'](url)
  }
}

export function replaceState (url?: string) {
  pushState(url, true)
}

```

两种模式大同小异，都是利用浏览器history对象的pushstate方法，hash模式则是判断浏览器支持pushstate方法时组合完整url调用，如果不支持，就直接替换浏览器hash值，浏览器的history对象其实提供了很多方法，比如

```
window.history.back() // 返回上一个页面
window.history.forward() // 前进
window.history.go(-1) // 返回
window.history.go(1)  // 前进
window.history.pushState()
window.history.replaceState()
```

![](https://user-gold-cdn.xitu.io/2020/5/24/17246eb0f0f36cc8?w=651&h=708&f=png&s=142744)
pushState方法实际下是像history记录集合里面新增了一个记录，我们看到pushState里面的参数第一个对象包含了一个key值,这个就是window.history.state对象，也就是每个记录的唯一标识.
replaceState方法和pushState方法的区别就是，替换了当前记录的state对象。

*这里要说一下，即使是pushstate和replaceState这两个方法，也不能触发popstate浏览器事件

当updateRoute更新当前路由，ensureUrl更新浏览器url和历史记录后，整个主线就完成了，还有一个疑问，就是updateRoute中的route对象是怎么匹配到的呢？

我们回过头来看路由匹配对象

### createMatcher.js

```
export function createMatcher (
  routes: Array<RouteConfig>,
  router: VueRouter
): Matcher {
  // 创建路由映射表
  const { pathList, pathMap, nameMap } = createRouteMap(routes)
  // 添加路由到映射表中
  function addRoutes (routes) {
    createRouteMap(routes, pathList, pathMap, nameMap)
  }
  // 路由匹配
  function match (
    raw: RawLocation,
    currentRoute?: Route,
    redirectedFrom?: Location
  ): Route {
    if (location.name) { // 名字匹配
      const record = nameMap[name]
      return _createRoute(record, location, redirectedFrom)
    } else if (location.href) { // 路径匹配
      const record = pathMap[path]
      return _createRoute(record, location, redirectedFrom)
    }
    // 没有匹配到
    return _createRoute(null, location)
    
  }

  return {
    match,
    addRoutes
  }
}

```
createMatcher返回了对象，通过闭包让我们可以调用里面的两个方法match，addRoutes，match方法大概就是通过名字或者路径在nameMap和pathMap中找对应的record，然后_createRoute方法创建一个完整的route对象。

我们先看看nameMap和pathMap，他们是通过createRouteMap创建的

### createRouteMap

```
export function createRouteMap (
  routes: Array<RouteConfig>,
  oldPathList?: Array<string>,
  oldPathMap?: Dictionary<RouteRecord>,
  oldNameMap?: Dictionary<RouteRecord>
): {
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>
} {
  // 路径列表用于控制路径匹配优先级
  const pathList: Array<string> = oldPathList || []
  const pathMap: Dictionary<RouteRecord> = oldPathMap || Object.create(null)
  const nameMap: Dictionary<RouteRecord> = oldNameMap || Object.create(null)
  // 遍历路由添加记录
  routes.forEach(route => {
    addRouteRecord(pathList, pathMap, nameMap, route)
  })

  // 确保通配符*路由始终在末尾
  for (let i = 0, l = pathList.length; i < l; i++) {
    if (pathList[i] === '*') {
      pathList.push(pathList.splice(i, 1)[0])
      l--
      i--
    }
  }
  // 返回url数组，映射表
  return {
    pathList,
    pathMap,
    nameMap
  }
}
// 添加路由记录
function addRouteRecord (
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>,
  route: RouteConfig,
  parent?: RouteRecord,
  matchAs?: string
) {
  const { path, name } = route
  const pathToRegexpOptions: PathToRegexpOptions =
    route.pathToRegexpOptions || {}
  // 格式化 url，替换 / 
  const normalizedPath = normalizePath(path, parent, pathToRegexpOptions.strict)

  if (typeof route.caseSensitive === 'boolean') {
    pathToRegexpOptions.sensitive = route.caseSensitive
  }
  // 记录对象，match返回的对象就是当前record对象
  const record: RouteRecord = {
    path: normalizedPath,
    regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
    components: route.components || { default: route.component }, // 组件模板
    instances: {},
    name,
    parent,
    matchAs,
    redirect: route.redirect,
    beforeEnter: route.beforeEnter,
    meta: route.meta || {},
    props:
      route.props == null
        ? {}
        : route.components
          ? route.props
          : { default: route.props }
  }
  // children递归添加路由记录
  if (route.children) {
    route.children.forEach(child => {
      const childMatchAs = matchAs
        ? cleanPath(`${matchAs}/${child.path}`)
        : undefined
      addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs)
    })
  }
  // 更新pathMap，保存了record
  if (!pathMap[record.path]) {
    pathList.push(record.path)
    pathMap[record.path] = record
  }

  if (route.alias !== undefined) {
    const aliases = Array.isArray(route.alias) ? route.alias : [route.alias]
    for (let i = 0; i < aliases.length; ++i) {
      const alias = aliases[i]
      if (process.env.NODE_ENV !== 'production' && alias === path) {
        warn(
          false,
          `Found an alias with the same value as the path: "${path}". You have to remove that alias. It will be ignored in development.`
        )
        // skip in dev to make it work
        continue
      }

      const aliasRoute = {
        path: alias,
        children: route.children
      }
      addRouteRecord(
        pathList,
        pathMap,
        nameMap,
        aliasRoute,
        parent,
        record.path || '/' // matchAs
      )
    }
  }

  if (name) {
    if (!nameMap[name]) {
      nameMap[name] = record
    } else if (process.env.NODE_ENV !== 'production' && !matchAs) {
      warn(
        false,
        `Duplicate named routes definition: ` +
          `{ name: "${name}", path: "${record.path}" }`
      )
    }
  }
}
```
createRouteMap返回了一个包含pathList，pathMap，nameMap的一个对象，
我们看到创建了全路由映射表的一个过程，执行完方法之后，返回了映射表path Map，nameMap, pathList是路径的一个集合数组。

pathMap和nameMap则是以path和name作为key，record作为值包含所有路由的数组，record是单个路由对象的一些属性，从上面代码我们可以推断，match方法返回的是 _createRoute(record, location, redirectedFrom)，我们看看 _createRoute方法


```
  function _createRoute (
    record: ?RouteRecord,
    location: Location,
    redirectedFrom?: Location
  ): Route {
    if (record && record.redirect) {
      return redirect(record, redirectedFrom || location)
    }
    if (record && record.matchAs) {
      return alias(record, location, record.matchAs)
    }
    return createRoute(record, location, redirectedFrom, router)
  }

export function createRoute (
  record: ?RouteRecord,
  location: Location,
  redirectedFrom?: ?Location,
  router?: VueRouter
): Route {
  const stringifyQuery = router && router.options.stringifyQuery

  let query: any = location.query || {}
  try {
    query = clone(query)
  } catch (e) {}
  // 最后返回的route对象
  const route: Route = {
    name: location.name || (record && record.name),
    meta: (record && record.meta) || {},
    path: location.path || '/',
    hash: location.hash || '',
    query,
    params: location.params || {},
    fullPath: getFullPath(location, stringifyQuery),
    matched: record ? formatMatch(record) : []
  }
  if (redirectedFrom) {
    route.redirectedFrom = getFullPath(redirectedFrom, stringifyQuery)
  }
  return Object.freeze(route)
}
```
我们理解一下，pathMap里面存放了所有路由的记录map，match通过path或者name去map里面匹配到这条记录，然后调用createRoute去创建一个路由对象并返回。

最后将返回的route对象，调用updateRoute方法，更新_route，触发render



还有问题，我们平时用this.$router.push({path: '/index', query: {a: 1}}),路由的内部调用了哪些方法，过程是怎样的？
## 从push到路由改变的完整流程
    以hash模式为例
    我们整理一下他的过程
    router.push() => hashHistory.push() => history.transitionTo() => History.updateRoute() => app._route = route => vm.render()

    我们先是用this.$router.push('/index')
    this.$router对象其实是new VueRouter出来的对象， 在install.js中定义了这个变量
    // 挂载变量到原型上
    Object.defineProperty(Vue.prototype, '$router', {
        get () { return this._routerRoot._router }
    })
    // 挂载变量到原型上
    Object.defineProperty(Vue.prototype, '$route', {
        get () { return this._routerRoot._route }
    })
    this._routerRoot._router // 根组件上的router对象
    调用router实例上的push方法，router.push调用hashHistory.push方法
    push方法去调用transitionTo传入location， 回调函数pushHash，改变浏览器url的hash值
    this.transitionTo():
        // 匹配得到要跳转的路由
        const route = this.router.match(location, this.current)
        // 更新路由
        updateRoute(route)
        // 更新url
        ensureURL()
    updateRoute里又做了什么？
        // 赋值当前路由给current变量
        this.current = route
        // 执行回调函数，这个回调函数是listen时设置的
        this.cb && this.cb(route)
        // 回调函数执行如下操作， 也就是更新了根组件上的_route对象（当前路由对象）
        app._route = route
        根组件上的_route是定义的响应式变量，所以会触发vm.render() 视图更新。
        
## router如何去监听url的变化
    // 监听hashchange以及popState
    hash.js：
        window.addEventListener(
            supportsPushState ? 'popstate' : 'hashchange',
            () => {
                const current = this.current
                if (!ensureSlash()) {
                    return
                }
                this.transitionTo(getHash(), route => {
                if (supportsScroll) {
                    handleScroll(this.router, route, current, true)
                }
                if (!supportsPushState) {
                    replaceHash(route.fullPath)
                }
                })
            }
        ) 
    hashchange事件和popstate事件什么时候会触发呢？
    hashchange是一个浏览器事件，浏览器前进后退，或者是手动更改url，通过这些事件去改变hash时，hashchange才会触发
    popstate也是一个浏览器事件，浏览器前进后退，会触发（手动更改url并不会触发，而且引起页面重新加载，即不是路由跳转的效果， 对window.location.href进行赋值相当于手动更改url）

    


## Hash模式和History模式区别总结
    替换url的方式不一样，history使用pushState和replaceState
    监听事件不一样，history只支持popstate