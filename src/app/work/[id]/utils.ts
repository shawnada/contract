// 防抖函数
export function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout | null = null
  return function (this: any, ...args: any[]) {
    const context = this
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(context, args)
    }, wait)
  }
}

// 下一帧执行
export function nextTick(callback: () => void) {
  requestAnimationFrame(callback)
}
