class Coordinate {
    constructor(input: string) {
    }

    get variables(): string[] {
        return []
    }
}

class Formula {
    constructor(input: string, variables: string[]) {
    }

    evaluate(point: Coordinate): number {
        return 0;
    }
}

class DiffOperator {
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
