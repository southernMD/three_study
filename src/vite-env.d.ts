/// <reference types="vite/client" />
declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '*.vs' {
  const content: string;
  export default content;
}

declare module '*.fs' {
  const content: string;
  export default content;
}