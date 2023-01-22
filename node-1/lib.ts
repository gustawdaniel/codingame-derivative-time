export class Coordinate {
    map: Map<string, number> = new Map();

    constructor(input: string) {
        const pairs = input.split(' ');
        for (let i = 0; i < pairs.length / 2; i++) {
            const [key, value] = [pairs[i * 2], Number.parseFloat(pairs[i * 2 + 1])];
            this.map.set(key, value);
        }
    }

    get variables(): string[] {
        return [...this.map.keys()]
    }

    get(name): number {
        return this.map.get(name) ?? 0;
    }
}

type Operator = '*' | '^' | '+' | '-';
type SubFormula = Array<string | number | SubFormula> | string | number

export class Formula {
    f: SubFormula;
    v: string[] = [];

    isDecomposable(input: string): boolean {
        return input.startsWith('(') && input.endsWith(')') && /[*^+-]/.test(input)
    }

    decomposeInput(input: string): SubFormula {
        let p: SubFormula = '', operator: Operator | '' = '', n: SubFormula = '', level: number = 0;
        if (!this.isDecomposable(input)) return [0];
        for (let i = 1; i < input.length - 1; i++) {
            if (level === 0 && !operator && /[*^+-]/.test(input[i])) {
                operator = input[i] as Operator;
                continue;
            } else if (input[i] === '(') {
                level++;
            } else if (input[i] === ')') {
                level--;
            }
            if (operator) {
                n += input[i];
            } else {
                p += input[i];
            }
        }

        if (this.isDecomposable(p)) {
            p = this.decomposeInput(p);
        } else {
            if (!this.v.includes(p)) {
                p = Number.parseFloat(p);
            }
        }
        if (this.isDecomposable(n)) {
            n = this.decomposeInput(n);
        } else {
            if (!this.v.includes(n)) {
                n = Number.parseFloat(n);
            }
        }
        return [operator, p, n];
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
                    return this.compute(p,point) - this.compute(n, point);
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
        return Formula.compute(this.f, point);
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
            const [op, ...rest] = s;
            for (let i = 0; i < rest.length; i++) {
                rest[i] = this.simplify(rest[i]);
            }
            if (rest.every((r) => typeof r === 'number')) {
                return Formula.compute(s, new Coordinate(''));
            }
            if (rest[0] === 0) {
                if (op === '+') return rest[1]
                if (op === '*') return 0
                if (op === '^') return 0
            }
            if (rest[0] === 1) {
                if (op === '*') return rest[1]
                if (op === '^') return 1
            }
            if (rest[1] === 0) {
                if (op === '+') return rest[0]
                if (op === '*') return 0
                if (op === '^') return 1
            }
            if (rest[1] === 1) {
                if (op === '*') return rest[0]
                if (op === '^') return rest[0]
            }
            return [op, ...rest];
        } else {
            return s;
        }
    }

    static derivative(s: SubFormula, dir: string): SubFormula {
        if (Array.isArray(s)) {
            const [op, p, n] = s;
            switch (op) {
                case '*':
                    return ['+', ['*', p, this.derivative(n, dir)], ['*', this.derivative(p, dir), n]];
                case '+':
                    return ['+', this.derivative(p, dir), this.derivative(n, dir)];
                case '-':
                    return ['-', this.derivative(p, dir), this.derivative(n, dir)];
                case '^': {
                    if (p === dir) {
                        if (n === 0) return 0;
                        return typeof n === 'number' ? ['*', n, ['^', p, n - 1]] : ['*', n, ['^', p, ['+', n, -1]]]
                    } else {
                        return 0;
                    }
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

    return diff.actOn(formula).evaluate(point).toString();
}
