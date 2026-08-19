declare module '*.css?inline' {
  const content: string;
  export default content;
}

declare module '*.gif?inline' {
  const src: string;
  export default src;
}
