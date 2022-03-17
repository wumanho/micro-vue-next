class RefImpl {
    private readonly _value: any

    constructor(value) {
        this._value = value
    }

    get value() {
        return this._value
    }
}

export function ref(value) {
    return new RefImpl(value)
}