/// <reference types="vite/client" />

declare const __GIT_HASH__: string

declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
