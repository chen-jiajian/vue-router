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
    (2)init方法初始化根组件，在index.js中，对实例后的history对象，调用transitionTo()方法，后面讲transitionTo方法非常重要，push和初始化和url改变触发的事件都调用了它
        transitionTo方法作用：更新路由，执行回调函数
            1.匹配到路由 match
            2.更新路由对象 updateRoute 中去执行cb回调函数，cb回调函数是在listen中设置的，
            index.js中设置了listen的回调函数
            history.listen(route => {
                this.apps.forEach((app) => {
                    app._route = route // 更新了app上面的_route 这个是当前组件的意思
                })
            })

        调用history.listen方法，传入一个函数，这个函数会在路由更新时调用，也就是updateRoute方法中执行，等会再看updateRoute方法做了什么，传入的这个函数，更新了根组件上的_route属性(当前路由对象)，也就是a组件变化成b组件时，根组件上的_route从a的路由信息，变成了b的路由信息
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
    hashHistory.push() => history.transitionTo() => History.updateRoute() => app._route = route => vm.render()

### 4.如何去监听url的变化
    hashchange以及popState

## Hash模式和History模式区别？
    替换url的方式不一样，history使用pushState和replaceState
    监听事件不一样，history只支持popstate