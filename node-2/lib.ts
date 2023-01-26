export class Coordinate {
    map: Map<string, number> = new Map([
        ['e', Math.E],
        ['pi', Math.PI],
    ]);

    constructor(input: string) {
        const pairs = input.split(' ');
        for (let i = 0; i < pairs.length / 2; i++) {
            const [key, value] = [pairs[i * 2], Number.parseFloat(pairs[i * 2 + 1])];
            this.map.set(key, value);
        }
    }

    get variables(): string[] {
        return [...this.map.keys()].filter((n) => !['e', 'pi'].includes(n))
    }

    get(name: string): number {
        return this.map.get(name) ?? 0;
    }
}

type Operator = '*' | '^' | '+' | '-';
type SubFormula = Array<string | number | SubFormula> | string | number

export function round(value: number): number {
    return value === Math.round(value) ? value : Math.round(value * 100) / 100
}

export class Formula {
    f: SubFormula;
    v: string[] = [];

    isDecomposable(input: string): boolean {
        return input.length >= 3 && /([*^+-]|ln|sin|cos)/.test(input)
    }

    static isParsableAsNumber(input: string): boolean {
        return input.length > 0 && /^-?[0-9.]+$/.test(input)
    }

    static simplify(arg: SubFormula): SubFormula {
        if (Array.isArray(arg)) {
            if (arg.length === 1 && Array.isArray(arg[0])) {
                return Formula.simplify(arg[0])
            } else if (arg.length) {
                const [op, ...subArgs] = arg;
                if (['+', '*'].includes(op as string)) {
                    let subArgsBuff: SubFormula[] = [];
                    let deletions = 0;
                    for (let i = 0; i < subArgs.length; i++) {
                        let sa = Formula.simplify(subArgs[i]);
                        if (Array.isArray(sa) && sa.length && sa[0] === op) {
                            const [_subOp, ...subSubArgs] = sa;
                            subArgsBuff.push(...subSubArgs);
                            subArgs.splice(i  - deletions, 1);
                            deletions += 1;
                        }
                    }
                    subArgs.push(...subArgsBuff);
                    return [op, ...subArgs.map(sa => Formula.simplify(sa))]
                } else if (op === '^' && arg.length > 3) {
                    arg = Formula.pileUpPowerArgs(subArgs)
                    return arg;
                }
            }
        }
        return arg;
    }

    static pileUpPowerArgs(args: SubFormula[]): SubFormula[] {
        args = [...args];
        let tmpArgs: SubFormula = [];
        tmpArgs.unshift(args.pop() as SubFormula);
        while (args.length) {
            if (tmpArgs.length >= 3) {
                tmpArgs = [tmpArgs];
            }
            tmpArgs.unshift(args.pop() as SubFormula);
            tmpArgs.unshift('^');
        }
        return tmpArgs;
    }

    decomposeInput(input: string): SubFormula {
        let args: SubFormula[] = [];
        let operators: Operator[] = []
        let level: number = 0;
        if (!this.isDecomposable(input)) return [0];
        let argBuffer = '';

        if (input.length > 2 && input.startsWith('(') && input.endsWith(')')) {
            const internal = input.slice(1, input.length - 1);
            if (!(internal.indexOf(')') < internal.indexOf('('))) {
                input = internal;
            }
        }

        for (let i = 0; i < input.length; i++) {

            if (input[i] === '(') {
                level++;
            } else if (input[i] === ')') {
                level--;
            }

            if (level === 0 && argBuffer && /[*^+-]/.test(input[i])) {
                if (argBuffer) {
                    args.push(argBuffer);
                    argBuffer = '';
                }
                operators.push(input[i] as Operator)
            } else if (level === 0 && input.length - 1 > i + 2 && input.slice(i, 2) === 'ln') {
                if (argBuffer) {
                    args.push(argBuffer);
                    argBuffer = '';
                }
                operators.push(input.slice(i, 2) as Operator);
                if (input[i + 2] === ' ') {
                    i++
                }
                i += 1;
            } else if (level === 0 && input.length - 1 > i + 3 && ['sin', 'cos'].includes(input.slice(i, 3))) {
                if (argBuffer) {
                    args.push(argBuffer);
                    argBuffer = '';
                }
                operators.push(input.slice(i, 3) as Operator);
                if (input[i + 3] === ' ') {
                    i++
                }
                i += 2;
            } else {
                argBuffer += input[i];
            }
        }
        args.push(argBuffer);

        for (let i = 0; i < args.length; i++) {
            if (typeof args[i] === 'string' && this.isDecomposable(args[i] as string)) {
                args[i] = this.decomposeInput(args[i] as string);
            } else if (typeof args[i] === 'string' && Formula.isParsableAsNumber(args[i] as string)) {
                args[i] = Number.parseFloat(args[i] as string);
            }
        }

        // if (this.isDecomposable(p)) {
        //     p = this.decomposeInput(p);
        // } else {
        //     if (!this.v.includes(p)) {
        //         p = Number.parseFloat(p);
        //     }
        // }
        // if (this.isDecomposable(n)) {
        //     n = this.decomposeInput(n);
        // } else {
        //     if (!this.v.includes(n)) {
        //         n = Number.parseFloat(n);
        //     }
        // }
        // [ln, sin, cos] > [^] > [*] > [+]

        // a+b*c => [+,a,[*,b,c]]

        // a+b+c+d => [+, a,b,c,d]
        for (let singleArgOperator of ['ln', 'sin', 'cos']) {
            for (let i = 0; i < operators.length; i++) {
                if (operators[i] === singleArgOperator) {
                    args[i] = [singleArgOperator, args[i]]
                    operators.splice(i, 1);
                    i--;
                }
            }
        }
        for (let doubleArgOperator of ['^', '*', '+'] as Operator[]) {
            if (operators.length && operators.every(op => op === doubleArgOperator)) {
                operators = [];
                if (doubleArgOperator === '^') {
                    args = Formula.pileUpPowerArgs(args);
                } else {
                    args.unshift(doubleArgOperator)
                }
            }

            // with arguments for given operator before apply change
            let opArgsBuffer = [];

            for (let i = 0; i < operators.length; i++) {
                // a+ b _*_ c*d ] +e
                if (operators[i] === doubleArgOperator) {
                    if (opArgsBuffer.length) {
                        opArgsBuffer.push(args[i + 1])
                    } else {
                        opArgsBuffer.push(args[i], args[i + 1]);
                    }
                    if (operators.length - 1 >= i + 1 && operators[i + 1] === doubleArgOperator) {
                        continue;
                    }

                    args[i - (opArgsBuffer.length - 2)] = [doubleArgOperator, ...opArgsBuffer]
                    args.splice(i + 1 - (opArgsBuffer.length - 2), opArgsBuffer.length - 1);
                    operators.splice(i - (opArgsBuffer.length - 2), opArgsBuffer.length - 1);
                    i--;
                    opArgsBuffer = [];
                }
            }
        }

        return Formula.simplify(args);
    }

    constructor(input: string, variables: string[]) {
        this.v = variables;
        this.f = this.decomposeInput(input);
    }

    static compute(f: SubFormula | string | number, point: Coordinate): number {
        if (Array.isArray(f)) {
            const [op, ...rest] = f;
            switch (op) {
                case '+':
                    return <number>rest.reduce((p: number, n: SubFormula): number => p + this.compute(n, point), 0);
                case '*':
                    return <number>rest.reduce((p: number, n: SubFormula): number => p * this.compute(n, point), 1);
                case '^': {
                    const [p, n] = rest;
                    return Math.pow(this.compute(p, point), this.compute(n, point));
                }
                case '-': {
                    const [p, n] = rest;
                    return this.compute(p, point) - this.compute(n, point);
                }
                case 'ln': {
                    const [p] = rest;
                    return Math.log(this.compute(p, point))
                }
                case 'sin': {
                    const [p] = rest;
                    return Math.sin(this.compute(p, point))
                }
                case 'cos': {
                    const [p] = rest;
                    return Math.cos(this.compute(p, point))
                }
                default:
                    return 0;
            }
        } else if (typeof f === 'number') {
            return f;
        } else {
            return point.get(f);
        }
    }

    evaluate(point: Coordinate): number {
        const value = Formula.compute(this.f, point);
        return round(value);
    }

    clone(): Formula {
        const o = new Formula('', []);
        o.f = JSON.parse(JSON.stringify(this.f));
        o.v = JSON.parse(JSON.stringify(this.f));
        return o;
    }
}

export class DiffOperator {
    d: string[] = [];

    constructor(input: string) {
        this.d = input.split(' ');
    }

    static simplify(s: SubFormula): SubFormula {
        if (Array.isArray(s)) {
            let [op, ...rest] = s;
            for (let i = 0; i < rest.length; i++) {
                rest[i] = this.simplify(rest[i]);
            }
            if (rest.every((r) => typeof r === 'number')) {
                return Formula.compute([op, ...rest], new Coordinate(''));
            }
            if (rest.filter((r) => typeof r === 'number').length >= 2) {
                rest = [
                    // op,
                    Formula.compute([op, ...rest.filter((r) => typeof r === 'number')], new Coordinate('')),
                    ...rest.filter((r) => typeof r !== 'number')
                ];
            }
            if (rest.includes(0)) {
                if (op === '+') {
                    const noZero = rest.filter(r => r !== 0);
                    if (noZero.length === 1) return noZero[0];
                    return Formula.simplify(['+', ...noZero])
                }
                if (op === '*') return 0
                if (op === '^') {
                    return rest[0] === 0 ? 0 : 1;
                }
            }
            if (rest.includes(1)) {
                if (op === '*') {
                    const noOne = rest.filter(r => r !== 1);
                    if (noOne.length === 1) return noOne[0];
                    return Formula.simplify(['*', ...noOne])
                }
                if (op === '^') {
                    return rest[0] === 1 ? 1 : rest[0]
                }
            }
            return [op, ...rest];
        } else {
            return s;
        }
    }

    static eq(a: SubFormula, b: SubFormula): boolean {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    static depend(s: SubFormula, dir: string): boolean {
        if (Array.isArray(s)) {
            const [_op, ...rest] = s;
            return rest.some((el) => DiffOperator.depend(el, dir))
        } else {
            return typeof s === 'string' && s === dir;
        }
    }

    static derivative(s: SubFormula, dir: string): SubFormula {
        if (Array.isArray(s)) {
            const [op, ...args] = s;
            const [p, n] = args;
            switch (op) {
                case '*':
                    // a b c ' = a' b c + a b' c + a b c'
                    return ['+',
                        ...args.map((arg, i) => ['*',
                            this.derivative(arg, dir),
                            ...args.filter((_, j) => j !== i)
                        ])
                    ];
                case '+':
                    return ['+', ...args.map(a => this.derivative(a, dir))];
                case '-':
                    return ['-', this.derivative(p, dir), this.derivative(n, dir)];
                case '^': {
                    if (DiffOperator.depend(p, dir) && DiffOperator.depend(n, dir) && DiffOperator.eq(p, n)) {
                        const fun = p;
                        return ['*',
                            ['+', ['ln', fun], 1],
                            ['^', fun, fun],
                            this.derivative(fun, dir)
                        ]
                    } else if (p === dir && n === dir) {
                        return ['*', ['+', ['ln', dir], 1], ['^', dir, dir]]
                    } else if (DiffOperator.depend(p, dir)) {
                        if (n === 0) return 0;
                        return typeof n === 'number' ? [
                            '*', n, ['^', p, n - 1], this.derivative(p, dir)
                        ] : [
                            '*', n, ['^', p, ['+', n, -1]], this.derivative(p, dir)
                        ]
                    } else if (n === dir) {
                        if (p === 0 || p === 1) return 0;
                        return ['*', ['^', p, n], ['ln', p]]
                    } else {
                        return ['*', ['^', p, n], ['ln', p], this.derivative(n, dir)];
                    }
                }
                case 'ln': {
                    if (p == dir) {
                        return ['^', p, -1];
                    } else {
                        return ['*', ['^', p, -1], this.derivative(p, dir)];
                    }
                }
                case 'cos': {
                    return ['*', -1, ['sin', p], this.derivative(p, dir)];
                }
                case 'sin': {
                    return ['*', ['cos', p], this.derivative(p, dir)];
                }
                default: {
                    return 0;
                }
            }

        } else if (typeof s === 'string' && s === dir) {
            return 1
        } else {
            return 0;
        }
    }

    actOn(f: Formula): Formula {
        const o = f.clone();
        return this.d.reduce((p, n) => {
            o.f = DiffOperator.simplify(DiffOperator.derivative(p.f, n));
            return o;
        }, o);
    }
}

export function run(input: string): string {
    const [F, vs, dict] = input.split('\n');
    const point = new Coordinate(dict);
    const diff = new DiffOperator(vs);
    const formula = new Formula(F, point.variables);

    return diff.actOn(formula).evaluate(point).toFixed(2);
}
