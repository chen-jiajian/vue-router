import Vue from 'vue'
import VueRouter from 'vue-router'

import {getCookie} from 'xys-util'
import {isMobile} from 'xys-util'
console.log('xys', getCookie)
Vue.use(VueRouter)

const test3 = { template: '<div>test</div>' }
const test1 = { template: '<div>test1</div>' }
const test2 = { template: '<div>test2</div>' }

const router = new VueRouter({
  mode: 'history',
  base: __dirname,
  routes: [
    { path: '/', component: test3 },
    { path: '/test1', component: test1 },
    { path: '/test2', component: test2 }
  ]
})

new Vue({
  router,
  data: () => ({ n: 0 }),
  template:
    `
      <div id="app">
        <h1>test</h1>
        <a href="test">test</a>
        <a href="/test/test1">test11aaaaaa</a>
        <router-link to="/test1">test1</router-link>
        <button style="cursor: pointer" @click="goto">test2</button>
        <router-link to="/test2">test2</router-link>
        <router-view></router-view>
      </div>
    `,
  methods: {
    goto () {
      this.$router.push('/test/test2')
      console.log('tototototototototo:', this.$router)
    }
  }
}).$mount('#app')
