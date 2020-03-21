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
        // defineReactive() 就是用于定义响应式数据的工具函数，_route依赖history.current，current改变时，触发更新机制，组件的render方法会调用，组件的_route值也会变更
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
