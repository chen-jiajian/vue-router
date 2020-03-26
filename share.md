# vue-router原理分析


## 路由改变时到组件更新的过程是怎样的？
    这个问题理解了，我们就明白了route的原理了，把这个问题再拆分成两个问题。
#### （1）url更新时，怎么不触发页面重新加载, 去更新组件？
#### （2）我们手动调用切换组件时，这个过程经历了什么？

### 1.我们先来看，我们要使用route，必须先安装这个插件，分析一下route作为插件安装到项目中的一个过程
#### vue.use
    我们知道在vue中使用插件一般是用vue.use(插件)，vue.use其实就是调用了插件的一个install方法，也就是route插件里有个install方法，去执行一下安装的操作，如果说没有install方法，那么vue会将这个插件当作一个函数来执行

#### install.js
    1.导出一个install方法
    2.Vue.mixin 
    (1)混入一个beforeCreate() 对根组件初始化：哪个是组件，Vue的实例就是根组件，记得我们在Vue实例化的时
    候，给Vue添加了router这个属性，所以我们能轻松的找到根组件。
    (2)init方法初始化根组件，在index.js中，对实例后的history对象，调用transitionTo()方法，后面讲transitionTo方法非常重要，更新路由的完整过程，push和初始化和url改变触发的事件都调用了它， 
        
    还调用了history.setupListeners
        监听路由变化事件(popstate, hashchange),然后调用transitionTo方法
    (3)而且定义了_route这个响应式变量，只要改变_route，视图就能更新

    3.定义两个属性：_router,_route
    Object.defineProperty(Vue.prototype, '$router', {
        get() {return this._routerRoot._router}
    })
    返回的this._routerRoot._router是什么呢？

    4.全局注册了RouterView和RouterLink两个组件

#### new VueRouter
    传入routes对象
    new VueRouter({
        routes: []
    })
    看下index.js 里的构造函数constructor
    判断你的模式，初始化history对象
    定义了各种方法，push，replace，go，
### 2.实例化以及初始化
    hash，history模式初始化以及建立关联
    在new VueRouter里面初始化history对象
    new History(this, base) // base就是地址最后一个
    定义了hash模式的push，replace，go等方法
### 3.根据push如何去匹配组件
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
    


## Hash模式和History模式区别？
    替换url的方式不一样，history使用pushState和replaceState
    监听事件不一样，history只支持popstate