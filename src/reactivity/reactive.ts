export function reactive(raw) {
    return new Proxy(raw, {
        //target = 原始对象raw，key就是用户访问的那个key
        get(target: any, key: string | symbol): any {
            return Reflect.get(target,key)
        },
        set(target: any, key: string | symbol, value: any): any {
            return Reflect.set(target, key, value)
        }
    })
}