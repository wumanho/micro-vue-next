# micro-vue-next

:dart: vuejs/core 的基本实现

&nbsp;

## 如何使用

```
# 打包
yarn build

# 测试
yarn test
```

&nbsp;

## src/reactivity

:star2: API：reactive

:star2: API：ref

:star2: API：readonly

:star2: API：computed

:star2: track：依赖收集

:star2: trigger：依赖触发

:star2: API：isReactive

:star2: reactive 嵌套

:star2: API：toRaw

:star2: effect.scheduler 执行调度

:star2: effect.stop 停止触发依赖

:star2: API：isReadonly

:star2: API：isProxy

:star2: shallowReadonly 非嵌套只读

:star2: API：proxyRefs

&nbsp;

## src/runtime-core

:star2: 支持组件类型

:star2: 支持 element 类型

:star2: 支持组件 props

:star2: 支持 $el api

:star2: setup 可获取 props 和 contex

:star2: emit 自定义事件

:star2: 组件通过 proxy 实现 this 功能

:star2: 可以在 render 函数中获取 setup 返回的对象

:star2: 基础插槽支持

:star2: 具名插槽支持

:star2: 作用域插槽支持

:star2: nextTick 的实现

:star2: 支持 getCurrentInstance

:star2: 支持 provide/inject

:star2: 支持 Text 类型节点

&nbsp;

## 项目相关的博客

[Vue3 源码中的 Reactivity 学习和思考](https://wumanho.cn/posts/vue3reactivity/)

[Vue3 源码中的位运算](https://wumanho.cn/posts/vueshapeflags/)
