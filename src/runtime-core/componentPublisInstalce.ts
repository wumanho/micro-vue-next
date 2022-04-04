const publicPropertiesMap = {
    $el: (i) => i.vnode.el
}

export const PublicInstanceProxyHandlers = {
    get({_: instance}, key) {
        //拿到 setupState
        const {setupState} = instance
        if (key in setupState) {
            return setupState[key]
        }
        // this.$el 获取根元素
        const publicGetter = publicPropertiesMap[key]
        if (publicGetter) {
            return publicGetter(instance)
        }
    }
}
