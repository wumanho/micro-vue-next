import {effect} from "../src/effect";
import {ref, isRef, unRef,proxyRef} from "../src/ref"
import {reactive} from "../src/reactive";

describe("ref", () => {
    it("happy path", () => {
        const a = ref(1)
        expect(a.value).toBe(1)
    })
    it("should be reactive", () => {
        const a = ref(1)
        let dummy
        let calls = 0
        effect(() => {
            calls += 1
            dummy = a.value
        })
        expect(calls).toBe(1)
        expect(dummy).toBe(1)
        a.value = 2
        expect(calls).toBe(2)
        expect(dummy).toBe(2)
        // value 不变的话，不走 trigger
        a.value = 2
        expect(calls).toBe(2)
        expect(dummy).toBe(2)
    })
    it("should make nested properties reactive", () => {
        const a = ref({
            count: 1
        })
        let dummy
        effect(() => {
            dummy = a.value.count
        })
        expect(dummy).toBe(1)
        a.value.count = 2
        expect(dummy).toBe(2)

    })
    it('isRef', function () {
        const a = ref(1)
        const user = reactive({
            age:1
        })
        expect(isRef(a)).toBe(true)
        expect(isRef(1)).toBe(false)
        expect(isRef(user)).toBe(false)
    });
    it('unRef', function () {
        const a = ref(1)
        expect(unRef(a)).toBe(1)
        expect(unRef(1)).toBe(1)
    });
    it('proxyRef', function () {
        const user = {
            age:ref(10),
            name:"xiaohong"
        }
        const proxyUser = proxyRef(user)
        expect(user.age.value).toBe(10)
        expect(proxyUser.age).toBe(10)
        expect(proxyUser.name).toBe("xiaohong")
        proxyUser.age = 20
        expect(proxyUser.age).toBe(20)
        expect(user.age.value).toBe(20)
        proxyUser.age = ref(20)
        expect(proxyUser.age).toBe(20)
        expect(user.age.value).toBe(20)
    });
})
