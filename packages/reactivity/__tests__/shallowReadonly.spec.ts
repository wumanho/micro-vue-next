import {isReadonly, readonly, shallowReadonly} from "../src/reactive";
import {vi} from 'vitest'
describe("shallowReadonly", () => {
    test("should not make non-reactive properties reactive", () => {
        const props = shallowReadonly({n: {foo: 1}})
        expect(isReadonly(props)).toBe(true)
        expect(isReadonly(props.n)).toBe(false)
    })
    it('should throw a warning when call set as realonly', () => {
        console.warn = vi.fn()
        const user = shallowReadonly({
            age: 10
        })
        user.age = 11
        expect(console.warn).toHaveBeenCalled()
    })
})
