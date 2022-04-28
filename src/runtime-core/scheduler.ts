const queue: any[] = []
let isFlushPending = false
const p = Promise.resolve()

/**
 * nextTick API
 * @param fn
 */
export function nextTick(fn) {
    return fn ? p.then(fn) : p
}

/**
 * 异步队列
 * @param job 任务
 */
export function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job)
    }
    queueFlush()
}

/**
 * 通过微任务的方式执行收集到的 Job
 */
function queueFlush() {
    // isFlushPending 标记当前微任务是否已经执行完毕
    if (isFlushPending) return
    // 锁住状态，以免下一个任务过来的时候又创建一个 Promise
    isFlushPending = true
    // 通过微任务执行所有 job
    nextTick(flushJobs)
}

function flushJobs() {
    let job
    while (job = queue.shift()) {
        job && job()
    }
    // 解锁
    isFlushPending = false
}
