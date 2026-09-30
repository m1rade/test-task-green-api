let counter = 0

export function createLocalId(prefix = 'local'): string {
  counter += 1
  const time = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${time}-${counter.toString(36)}-${random}`
}
