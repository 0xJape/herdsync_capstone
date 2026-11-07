export function safeReturnPath(value: string | null, fallback = "/livestock") {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
