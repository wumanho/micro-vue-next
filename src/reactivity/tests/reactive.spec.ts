import {reactive} from "../reactive";

describe('reactive',()=>{
    it('happy path',()=>{
        const original = {foo:1}
        const observed = reactive(original)
        //observed一定不等于original
        expect(observed).not.toBe(original)
        expect(observed.foo).toBe(1)
    })
})