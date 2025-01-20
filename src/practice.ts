import { init } from "next/dist/compiled/webpack/webpack";
import { mapAsync } from "valibot";

type F<T> = () => Promise<T>;
type ArrayValue<T extends unknown[] | []> = T extends Array<infer U> ? U : never;
function promisePool<T extends Array<() => Promise<unknown>> | []>(functions: T, n: number): Promise<{ [P in keyof T]: Awaited<ReturnType<T[P]>>}>{
    if (functions.length === 0) {
      return Promise.resolve([]) as Promise<{ [P in keyof T]: Awaited<ReturnType<T[P]>>}>;
    }

    const functionsCopy = [...functions];
    let resolveCount = 0;
    let numInProgress = 0;
    let index = 0;
    const rval: Array<unknown> = [];
    // const {resolve, reject, promise} = Promise.withResolvers<{ [P in keyof T]: Awaited<ReturnType<T[P]>>}>();
    let resolve: (value: { [P in keyof T]: Awaited<ReturnType<T[P]>>; } | PromiseLike<{ [P in keyof T]: Awaited<ReturnType<T[P]>>; }>) => void;
    let reject: (reason?: unknown) => void;
    const promise = new Promise<{ [P in keyof T]: Awaited<ReturnType<T[P]>>}>(
      (res, rej) => {
        resolve = res;
        reject = rej;
      }
    )
  
    const runNextTask = () => {
      if (numInProgress >= n) {
        // Ignore
        return;
      }

      if (index >= functionsCopy.length) {
        // Ignore
        return;
      }

      numInProgress++;
      const p = functionsCopy[index]();
      p.then(createHandleResolve(index), reject);
      index++;
    }
  
    const createHandleResolve = (index: number) => (value: unknown) => {
      resolveCount++;
      numInProgress--;
      rval[index] = value;
      if (resolveCount === functionsCopy.length) {
        return resolve(rval as { [P in keyof T]: Awaited<ReturnType<T[P]>>});
      }

      runNextTask();
    }

    Array.from({length: n}).forEach(() => {
      runNextTask();
    });

    return promise;
};
promisePool([], 0)


type JSONValue = null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue };

function isPrimitive(val: unknown): val is null | number | boolean | string {
  return val === null || typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string';
}

function jsonStringify(object: JSONValue): string {
  if (typeof object === 'string') {
    return `"${object}"`;
  }

  if (isPrimitive(object)) {
    return String(object);
  }

  if (Array.isArray(object)) {
    return "[" + object.map((value) => jsonStringify(value)).join(",") + "]";
  }

  return "{" + Object.keys(object).map((key) => `"${key}":${jsonStringify(object[key])}`).join(",") + "}";
};
const a: number = 1;
const b = [[123]].flat()


declare global {
  interface PromiseConstructor {
    try<T>(fn: () => T): Promise<T>
  }
}


Promise.try = function<T>(fn: () => T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      resolve(fn());
    }
    catch (e) {
      reject(e);
    }
  });
}

Promise.try(() => {throw new Error('this is a test error')}).catch((e) => console.error(e))

enum PromiseState {
  FULLFILLED = 'fullfilled',
  REJECTED = 'rejected',
  PENDING = 'pending'
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (isObject(value) || typeof value === 'function') && 'then' in value && typeof value.then === 'function';
}

type AnyFunction = (...args: any[]) => any;
export class MyPromise<T> {
  private state: PromiseState = PromiseState.PENDING;
  private result: T | undefined;
  private error: any;
  private pendingResolves: Array<AnyFunction> = [];
  private pendingRejects: Array<AnyFunction> = [];

  static withResolvers<T>() {
    let resolve: (value: T | PromiseLike<T>) => void = () => {};
    let reject: (reason?: any) => void = () => {};

    return {
      promise: new MyPromise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      }),
      resolve,
      reject,
    }
  }

  static reject<T = never>(reason?: any): MyPromise<T> {
    return new MyPromise<T>((_, reject) => reject(reason));
  }

  static resolve(): MyPromise<void>;
  static resolve(value: unknown): MyPromise<unknown>;
  static resolve<T>(value?: T | PromiseLike<T>): MyPromise<T> {
    if (value instanceof MyPromise) {
      return value;
    }

    if (isPromiseLike(value)) {
      return new MyPromise<T>((resolve, reject) => {
        value.then(resolve, reject);
      });
    }

    return new MyPromise<T>((resolve) => resolve(value!));
  }

  static all<T extends unknown[] | []>(promises: T): MyPromise<{-readonly[P in keyof T]: Awaited<T[P]>}> {
    let fullfiled = 0;
    const results: Array<unknown> = [];
    const copiedPromises = [...promises]; 
    const {
      promise: rPromise, 
      resolve, 
      reject
    } = MyPromise.withResolvers<{-readonly[P in keyof T]: Awaited<T[P]>}>();
    copiedPromises.forEach((p, index) => {
      const promise = MyPromise.resolve(p); // Force convertr to a MyPromise
      promise.then((result: unknown) => {
        fullfiled++;
        results[index] = result;
        if (fullfiled === copiedPromises.length) {
          resolve(results as {-readonly[P in keyof T]: Awaited<T[P]>});
        }
      }, reject);
    });

    return rPromise;
  }

  static race<T extends unknown[] | []>(promises: T): MyPromise<Awaited<T[number]>> {
    return new MyPromise((resolve, reject) => {
      promises.forEach((p) => {
        (MyPromise.resolve(p) as MyPromise<Awaited<T[number]>>).then(resolve, reject);
      });
    });
  }

  private _queueMicrotask(callback: () => void) {
    queueMicrotask(callback);
  }

  private _resolve(value: T | PromiseLike<T>) {
    if (isPromiseLike(value)) {
      // If resolved a promise, then depend on this promise's state
      value.then(this._resolve.bind(this), this._reject.bind(this));
      return;
    }
    this.result = value;
    this.state = PromiseState.FULLFILLED;
    this.handlePendingCallbacks();
  }

  private _reject(reason?: any) {
    this.error = reason;
    this.state = PromiseState.REJECTED;
    this.handlePendingCallbacks();
  }

  private handlePendingCallbacks() {
    switch (this.state) {
      case PromiseState.FULLFILLED:
        this.pendingResolves.forEach(resolve => this._queueMicrotask(() => resolve(this.result)));
        this.pendingRejects = [];
        break;
      case PromiseState.REJECTED:
        this.pendingRejects.forEach(reject => this._queueMicrotask(() => reject(this.error)));
        this.pendingResolves = [];
        break;
      case PromiseState.PENDING:
        break;
    }
  }

  constructor(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
    executor(this._resolve.bind(this), this._reject.bind(this));
    return Object.defineProperties(this, {
      pendingResolves: {
        enumerable: false,
        configurable: false,
        value: this.pendingResolves,
      },
      pendingRejects: {
        enumerable: false,
        configurable: false,
        value: this.pendingRejects,
      },
      then: {
        enumerable: false,
        configurable: false,
        value: this.then.bind(this),
      },
      catch: {
        enumerable: false,
        configurable: false,
        value: this.catch.bind(this),
      },
      finally: {
        enumerable: false,
        configurable: false,
        value: this.finally.bind(this),
      },
    })
  }

  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): MyPromise<TResult1 |TResult2> {
    return new MyPromise<TResult1 |TResult2>((resolve, reject) => {
        this.pendingResolves.push(() => {
          try {
            const result = onfulfilled ? onfulfilled(this.result!) : this.result!;
            if (isPromiseLike(result)) {
              result.then(resolve, reject);
            } else {
              resolve(result as TResult1);
            }
          } catch (e) {
            reject(e);
          }
        });
        this.pendingRejects.push(() => {
          try {
            const result = onrejected ? onrejected(this.error) : this.error;
            if (isPromiseLike(result)) {
              (result as PromiseLike<TResult2>).then(resolve, reject);
            } else {
              resolve(result);
            }
          } catch (e) {
            reject(e);
          }
        });
        this.handlePendingCallbacks();
      });
  }

  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): MyPromise<T | TResult> {
      return this.then(undefined, onrejected);
  }

  finally(onfinally?: (() => void) | null | undefined): MyPromise<T> {
    const {promise, resolve, reject} = MyPromise.withResolvers<T>();
    this.then((value) => {
      try {
        onfinally?.();
        resolve(value);
      } catch (e) {
        reject(e);
      }
    }, (reason) => {
      try {
        onfinally?.();
        reject(reason);
      } catch (e) {
        reject(e);
      }
    });
    return promise;
  }

  get [Symbol.toStringTag]() {
    return MyPromise.name;
  }
}