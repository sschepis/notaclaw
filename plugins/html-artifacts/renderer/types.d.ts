declare module '@babel/standalone' {
  export function transform(code: string, options: any): { code: string; map: any; ast: any };
  export function registerPlugin(name: string, plugin: any): void;
}

declare module 'prismjs' {
  export const languages: any;
  export function highlight(code: string, grammar: any, language: string): string;
}

declare module 'prismjs/components/prism-core';
declare module 'prismjs/components/prism-clike';
declare module 'prismjs/components/prism-javascript';
declare module 'prismjs/components/prism-markup';
declare module 'prismjs/themes/prism-tomorrow.css';
