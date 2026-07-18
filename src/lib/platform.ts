export function isNativePlatform(): boolean {
  const cap = (window as unknown as Record<string, unknown>).Capacitor as Record<string, unknown> | undefined
  return typeof cap?.isNativePlatform === 'function'
    ? (cap.isNativePlatform as () => boolean)() === true
    : false
}