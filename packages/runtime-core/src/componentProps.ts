/**
 * 初始化组件 props
 * @param instance 实例
 * @param rawProps 没有处理过的 props
 */
export function initProps(instance, rawProps) {
    instance.props = rawProps || {}
}
