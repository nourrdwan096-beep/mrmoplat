// CSS and Style module declarations for TypeScript compiler and IDEs (VS Code / TypeScript Language Server)
declare module '*.css' {
  const content: { [className: string]: string } | void;
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string } | void;
  export default content;
}

declare module '*.sass' {
  const content: { [className: string]: string } | void;
  export default content;
}

declare module '*.less' {
  const content: { [className: string]: string } | void;
  export default content;
}
