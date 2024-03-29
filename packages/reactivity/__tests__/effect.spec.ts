import {reactive} from "../src/reactive";
import {effect, stop} from "../src/effect";
import {vi} from 'vitest'

describe('effect', () => {
    it('happy path', () => {
        const user = reactive({
            age: 10,
            name: 'hi'
        })
        let nextAge;
        effect(() => {
            nextAge = user.age + 1
        })
        expect(nextAge).toBe(11)
        //update
        user.age += 1
        user.name = "test"
        expect(nextAge).toBe(12)
        expect(user.name).toBe("test")
    })

    it('should return runner when call effect', () => {
        let foo = 10
        const runner = effect(() => {
            foo += 1
            return 'foo'
        })
        expect(foo).toBe(11)
        const r = runner()
        expect(foo).toBe(12)
        expect(r).toBe('foo')
    });
    it('scheduler', () => {
        let dummy
        let run: any
        const scheduler = vi.fn(() => {
            run = runner
        })
        const obj = reactive({foo: 1})
        const runner = effect(
            () => {
                dummy = obj.foo
            },
            {scheduler}
        )
        expect(scheduler).not.toHaveBeenCalled()
        expect(dummy).toBe(1)
        //第一个trigger时，scheduler才会被调用
        obj.foo++
        expect(scheduler).toHaveBeenCalledTimes(1)
        //不会触发更新
        expect(dummy).toBe(1)
        //手动 run
        run()
        //更新了
        expect(dummy).toBe(2)
    });
    it('stop', () => {
        let dummy
        const obj = reactive({prop: 1})
        const runner = effect(() => {
            dummy = obj.prop
        })
        obj.prop = 2
        expect(dummy).toBe(2)
        stop(runner)
        //trigger失效
        // obj.prop = 3
        obj.prop++
        expect(dummy).toBe(2)
        //即使stop了，还是可以手动调用
        runner()
        expect(dummy).toBe(3)
    });
    it('onStop', () => {
        const obj = reactive({
            foo: 1
        })
        const onStop = vi.fn()
        let dummy
        const runner = effect(() => {
            dummy = obj.foo
        }, {onStop})
        stop(runner)
        expect(onStop).toBeCalledTimes(1)
    });
})
