import {reactive} from "../reactive";
import {effect} from "../effect";
import {run} from "jest";

describe('effect', () => {
    it('happy path', () => {
        const user = reactive({
            age: 10
        })
        let nextAge;
        effect(() => {
            nextAge = user.age + 1
        })
        expect(nextAge).toBe(11)
        //update
        user.age += 1
        expect(nextAge).toBe(12)
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
        const scheduler = jest.fn(() => {
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
})