class ComputedRefImpl {
    private readonly getter: () => any;

    constructor(getter) {
        this.getter = getter;
    }

    get value() {
        return this.getter();
    }
}

export function computed(getter) {
    return new ComputedRefImpl(getter)
}