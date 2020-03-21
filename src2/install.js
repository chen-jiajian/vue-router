import View from './view'

export function install(Vue) {
  if (install.installed) {
    return
  }
  install.installed = true
  const registerInstance = (vm) => {
    vm.$options._parentVnode(vm, vm)
  }
  const detroyedInstance = () => {
    vm.$options._parentVnode(vm)
  }
  Vue.mixin({
    beforeCreate() {
      if (this.$options.router) { // 根组件
        this._routerParent = this
        this._router
        this.$options.router.init()
        init()
      } else { // 非根组件 建立关联
        this._routerParent = this.$parent
      }
      // 注册实例
      registerInstance()
    },
    detroyed() {
      // 销毁实例
      detroyedInstance()
    }
  })
  // 挂载变量
  Vue.prototype.$router = this._routerParent._router
  Vue.prototype.$route = this._routerParent._route
  Vue.component('RouterView', View)
}
