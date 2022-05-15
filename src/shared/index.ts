export const extend = Object.assign
export const isObject = (val: any) => val !== null && typeof val === 'object'
export const hasChanged = (newVal, oldVal) => !Object.is(newVal, oldVal)
export const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key)
export const EMPTY_OBJ = {}
export const isString = (value) => typeof value === 'string'


//先将 add-foo 事件格式转换为 addFoo格式
export const camelize = (str: string) => {
    return str.replace(/-(\w)/g, (_, c: string) => {
        return c ? c.toUpperCase() : ""
    })
}
//将自定义事件的首字母转换成大写
const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}
//统一添加 on 作为事件开头
export const toHandlerKey = (str: string) => {
    return str ? 'on' + capitalize(str) : ''
}
