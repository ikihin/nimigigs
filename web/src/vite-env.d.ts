/// <reference types="vite/client" />

interface NimiqPayGlobal {
  language?: string
}

interface Window {
  nimiq?: unknown
  nimiqPay?: NimiqPayGlobal
}
