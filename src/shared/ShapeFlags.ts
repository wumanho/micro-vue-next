// 用于表示结点的类型
export const enum ShapeFlags {
    ELEMENT = 1,
    STATEFUL_COMPONENT = 1 << 1,  //1左移一位
    TEXT_CHILDREN = 1 << 2,  //1左移两位
    ARRAY_CHILDREN = 1 << 3,  //1左移三位
    SLOTS_CHILDREN = 1 << 4
}
