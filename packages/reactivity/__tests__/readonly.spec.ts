import {isReadonly, readonly, isProxy} from "../src";
import {vi} from 'vitest'

describe("readonly", () => {
  it("should be readonly", () => {
    const original = {foo: 1, bar: {baz: 2}}
    const wrapped = readonly(original)
    expect(wrapped).not.toBe(original)
    expect(isReadonly(wrapped)).toBe(true)
    expect(isReadonly(wrapped.bar)).toBe(true)
    expect(isProxy(wrapped)).toBe(true)
    expect(wrapped.foo).toBe(1)
  })
  it('should throw a warning when call set as realonly', () => {
    console.warn = vi.fn()
    const user = readonly({
      age: 10
    })
    user.age = 11
    expect(console.warn).toHaveBeenCalled()
  })
})
