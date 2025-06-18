// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';
import * as CANNON from 'cannon'
const router = createRouter({
  history: createWebHistory(),
  routes
});

let lastRoute: string | null = null;

router.afterEach((to, from) => {
  // 判断当前路由与上一次路由是否相同
  const currentPath = to.path;
  if (lastRoute !== currentPath && lastRoute != null) {
    // 如果不同则刷新页面
    window.location.reload();
  }
  // 更新 lastRoute
  lastRoute = currentPath;
});

export default router;