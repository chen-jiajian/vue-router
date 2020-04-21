import View from './components/view'
import Link from './components/link'

export function install(Vue) {
  if (install.installed) {
    return
  }
  install.installed = true
  const registerInstance = (vm, callVal) => {
    if (vm.$options._parentVnode) {
      vm.$options._parentVnode(vm, callVal)
    }
  }
  const detroyedInstance = () => {
    if (vm.$options._parentVnode) {
      vm.$options._parentVnode(vm)
    }
  }
  Vue.mixin({
    beforeCreate() {
      if (this.$options.router) { // 根组件
        console.log('根组件：', this);
        this._routerRoot = this
        this._router = this.$options.router
        this._router.init(this)
        Vue.util.defineReactive(this, '_route', this._router.history.current) // 赋值当前路由对象
      } else { // 非根组件 建立关联
        this._routerRoot = this.$parent || this
      }
      // 注册实例
      // registerInstance(this, this)
    },
    detroyed() {
      // 销毁实例
      // detroyedInstance(this)
    }
  })
  // 挂载变量
  // Vue.prototype.$router = this._routerParent._router
  // Vue.prototype.$route = this._routerParent._route
  // 挂载变量到原型上
  Object.defineProperty(Vue.prototype, '$router', {
    get() { return this._routerRoot._router }
  })
  // 挂载变量到原型上
  Object.defineProperty(Vue.prototype, '$route', {
    get() { return this._routerRoot._route }
  })

  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)
  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created

}
