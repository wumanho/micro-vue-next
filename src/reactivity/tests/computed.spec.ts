import {reactive} from "../reactive";
import {computed} from "../computed";

describe("computed", () => {
    it("happy path", () => {
        const user = reactive({
            age: 1,
        })
        const age = computed(() => {
            return user.age
        })
        expect(age.value).toBe(1)
    })
    it('should compute lazily', function () {
        const value = reactive({
            foo: 1,
        })
        const getter = jest.fn(() => value.foo)
        const cValue = computed(getter)
        // lazy
        expect(getter).not.toHaveBeenCalled()
        //只有调用.value，进入到 get 方法时，才会被调用一次
        expect(cValue.value).toBe(1)
        expect(getter).toHaveBeenCalledTimes(1)
        //值没有更改时
        cValue.value
        expect(getter).toHaveBeenCalledTimes(1)
        // 虽然设置了新的值，但只要没有 .value，都不会重新计算
        value.foo = 2
        expect(getter).toHaveBeenCalledTimes(1)
        // 这时候 getter 才会被调用
        expect(cValue.value).toBe(2)
        expect(getter).toHaveBeenCalledTimes(2)
        // 再次获取 .value，getter 不会重新计算
        cValue.value
        expect(getter).toHaveBeenCalledTimes(2)
    });
})