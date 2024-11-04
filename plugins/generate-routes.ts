// vite-plugin-generate-routes.ts
import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

interface RouteConfig {
  path: string;
  name: string;
  component: string;
  children?: RouteConfig[];
}

function generateRoutes(dir: string, basePath = ''): RouteConfig[] {
  const routes: RouteConfig[] = [];

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const children = generateRoutes(fullPath, `${basePath}/${file}`);
      if (children.length > 0) {
        routes.push({
          path: `${basePath}/${file}`,
          name: file,
          component: `() => import('@/views/${file}/index.vue')`,
          children
        });
      }
    } else if (stat.isFile() && file.endsWith('.vue') && !file.startsWith("index")) {
      const name = file.replace(/\.vue$/, '');
      routes.push({
        path: `${basePath}/${name}`,
        name,
        component: `() => import('@/views/${name}.vue')`
      });
    }
  }

  return routes;
}

function writeRoutesToFile(routes: RouteConfig[], filePath: string) {
  routes.push({
    "path": '/',
    "name": 'index',
    "component": `() => import('@/views/index.vue')`
  })
  const routesString = JSON.stringify(routes, null, 2).replace(/"(\(\) => import\('.*?'\))"/g, '$1');
  const content = `export const routes = ${routesString};`;

  fs.writeFileSync(filePath, content, 'utf-8');
}

function generateRoutesPlugin(): Plugin {
  return {
    name: 'generate-routes',
    buildStart() {
      const viewsDir = path.resolve(__dirname, '../src/views');
      const routesFilePath = path.resolve(__dirname, '../src/router/routes.ts');

      const routes = generateRoutes(viewsDir);
      writeRoutesToFile(routes, routesFilePath);

      console.log('Routes generated successfully.');
    }
  };
}

export default generateRoutesPlugin;