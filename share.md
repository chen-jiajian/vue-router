# vue-router原理分析

#### 路由的使用大家都不陌生，但是在使用的使用经常会有这样的问题，路由通过什么来实现跳转（改变显示的组件），而且页面没有刷新呢？

#### 我们来看看路由的基本用法：
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
#### 要使用route，必须先安装这个插件
### Vue.use(VueRouter) 
```
我们先从Vue.use(VueRouter)说起，use接收一个plugin参数，调用plugin里的install方法，如果没有定义install方法，会将plugin当作方法直接执行，我们看到install方法在install.js里面，做了一个installed赋值，防止重复安装。然后用了一个全局函数 _Vue来接收Vue，省去了import Vue
```
### install.js
#### 1.导出一个install方法
#### 2.Vue.mixin

    install里面很重要的就是，混入了一个生命周期-beforeCreate()，
```
beforeCreate() {
    if (isDef(this.$options.router)) { // 根组件
        this._routerRoot = this // 跟组件
        this._router = this.$options.router // 整个router对象
        this._router.init(this) // 初始化根组件路由
        // 定义响应式变量，触发Vue的render更新
        Vue.util.defineReactive(this, '_route', this._router.history.current) 
    } else { // 非根组件 建立关联
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
    }
    // 注册实例
    registerInstance()
}
```
#### 3.init
```
    this.apps.push(app)// 添加根组件进数组
    if (this.app) {
      return
    }
    this.app = app
    const history = this.history
    // 调用transitionTo过渡方法, 初始化渲染？
    if (history instanceof HTML5History) {
      // 后面讲transitionTo方法非常重要，更新路由的完整过程，push和初始化和url改变触发的事件都调用了它， 
      history.transitionTo(history.getCurrentLocation())
    } else if (history instanceof HashHistory) {
      const setupHashListener = () => {
        history.setupListeners()
      }
      history.transitionTo(
        history.getCurrentLocation(),
        setupHashListener,
        setupHashListener
      )
    }
    // 设置监听事件
    history.listen(route => {
      this.apps.forEach((app) => {
        app._route = route
      })
    })
```

#### 4.挂载变量
```
// 挂载变量到原型上
Object.defineProperty(Vue.prototype, '$router', {
get () { return this._routerRoot._router }
})
Object.defineProperty(Vue.prototype, '$route', {
get () { return this._routerRoot._route }
})

```

#### 5.注册组件
```
// 注册全局组件
Vue.component('RouterView', View)
Vue.component('RouterLink', Link)
```


#### new VueRouter
```
constructor (options: RouterOptions = {}) {
  this.app = null // 根组件
  this.apps = [] // 根组件数组
  this.options = options // 传入的路由配置
  this.beforeHooks = [] // 钩子函数，后面说
  this.resolveHooks = []
  this.afterHooks = []
  this.matcher = createMatcher(options.routes || [], this) // 匹配路由器，后面说

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
#### hash.js
    上面看到new HTML5History(this, options.base),我们看看实例化的时候都做了什么

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
看到这里我们也知道，history里面设置监听了hashchange和popstate去监听url的变化，然后去调用transitionTo去渲染新的路由

#### transitionTo

改end
### push如何去匹配组件
    以hash模式为例
    我们整理一下他的过程
    hashHistory.push() => history.transitionTo() => History.updateRoute() => app._route = route => vm.render()

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
        
### 4.如何去监听url的变化
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

    


## Hash模式和History模式区别？
    替换url的方式不一样，history使用pushState和replaceState
    监听事件不一样，history只支持popstate