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

interface InputFragment {
    p: string,
    n: string,
    operator: Operator
}

export class Formula {
    f: SubFormula;
    v: string[] = [];

    isDecomposable(input: string): boolean {
        return input.startsWith('(') && input.endsWith(')') && /[*^+-]/.test(input)
    }

    decomposeInput(input: string): SubFormula {
        const res = input.match(/\((.*?)([*^+-])(.*)\)/);
        if (res) {
            let p: SubFormula = res[1];
            let operator: Operator = res[2] as Operator;
            let n: SubFormula = res[3];
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
        return [0];
    }

    constructor(input: string, variables: string[]) {
        // ( 5 * ( x * y ) )
        // ['*', 5, ['*', 'x', 'y']]
        this.v = variables;
        this.f = this.decomposeInput(input);
    }

    compute(f: SubFormula | string | number, point: Coordinate): number {
        if (Array.isArray(f)) {
            const [op, ...rest] = f;
            switch (op) {
                case '+':
                    return <number>rest.reduce((p: number, n: SubFormula): number => p + this.compute(n, point), 0);
                case '*':
                    return <number>rest.reduce((p: number, n: SubFormula): number => p * this.compute(n, point), 1);
                case '^':
                    const [p, n]: [number, number] = rest;
                    return Math.pow(this.compute(p, point), this.compute(n, point));
                case '-':
                    return <number>rest.reduce((p: number, n: SubFormula): number => p - this.compute(n, point), 0);
                default:
                    return 0;
            }
        } else if (typeof f === 'number') {
            return f;
        } else if (this.v.includes(f)) {
            return point.get(f);
        } else {
            return 0;
        }
    }

    evaluate(point: Coordinate): number {
        return this.compute(this.f, point);
    }
}

export class DiffOperator {
    constructor(input: string) {
    }

    actOn(f: Formula): Formula {
        return f;
    }
}

export function run(input: string): string {
    const [F, vs, dict] = input.split('\n');
    const point = new Coordinate(dict);
    const diff = new DiffOperator(vs);
    const formula = new Formula(F, point.variables);

    return diff.actOn(formula).evaluate(point).toString();
}
