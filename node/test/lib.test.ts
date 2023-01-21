import {Coordinate, DiffOperator, Formula, run} from "../lib";

describe('coordinate', () => {
    it('parsing', () => {
        const point = new Coordinate('x 2 y 6');
        expect(point.variables).toEqual(['x', 'y']);
        expect(point.get('x')).toEqual(2);
        expect(point.get('y')).toEqual(6);
        expect(point.get('undefined')).toEqual(0);
    })
})
describe('formula', () => {
    const f = new Formula('(5*(x*y))', ['x', 'y']);

    it('parse', () => {
        expect(f.f).toEqual(['*', 5, ['*', 'x', 'y']]);
        expect(f.v).toEqual(['x', 'y']);
    });

    it('parse with many brackets', () => {
        const f = new Formula('((x^3)+(x^2))', ['x']);
        expect(f.f).toEqual(['+', ['^', 'x', 3], ['^', 'x', 2]])
    })

    it('evaluate', () => {
        expect(f.evaluate(new Coordinate('x 1 y 2'))).toStrictEqual(10);
    });
})
describe('diff operation', () => {
    it('simplify', () => {
        expect(DiffOperator.simplify(["+", ["*", 1, 0], ["*", 0, 1]])).toEqual(0);
        expect(DiffOperator.simplify(['^', 'x', 1])).toEqual('x');
        expect(DiffOperator.simplify(['*', 2, ['^', 'x', 1]])).toEqual(['*', 2, 'x']);
        expect(DiffOperator.simplify(["*", 5, ["+", ["*", "x", 0], ["*", 1, "y"]]])).toEqual(['*', 5, 'y'])
        expect(DiffOperator.simplify(["+", ["*", 5, ["+", ["*", "x", 0], ["*", 1, "y"]]], ["*", 0, ["*", "x", "y"]]])).toEqual(['*', 5, 'y'])
    });
    it("a'=0", () => {
        const f = new Formula('(1*1)', ['x']);
        const d = new DiffOperator('x');
        expect(d.actOn(f).f).toEqual(0);
    });
    it("(a*x)'=a", () => {
        const f = new Formula('(4*x)', ['x']);
        const d = new DiffOperator('x');
        expect(d.actOn(f).f).toEqual(4);
    });
    it("(x^a)'=a*x^(a-1) (when a is not 0)", () => {
        const cases = [
            {in: '(x^5)', out: ['*', 5, ['^', 'x', 4]]},
            {in: '(x^3)', out: ['*', 3, ['^', 'x', 2]]},
            {in: '(x^2)', out: ['*', 2, 'x']},
        ];
        for (const c of cases) {
            const f = new Formula(c.in, ['x']);
            const d = new DiffOperator('x');
            expect(d.actOn(f).f).toEqual(c.out);
        }
    });
    it('derivative', () => {
        expect(DiffOperator.simplify(DiffOperator.derivative(['*', 2, 'x'], 'x'))).toEqual(2);
        expect(DiffOperator.simplify(DiffOperator.derivative(['*', 5, ['*', 'x', 'y']], 'x'))).toEqual(['*', 5, 'y'])
    })
    it("(u+v)'=u'+v for (x+(x^2))'", () => {
        const f = new Formula('(x+(x^2))', ['x']);
        const d = new DiffOperator('x');
        expect(d.actOn(f).f).toEqual(['+', 1, ['*', 2, 'x']]);
    });

    it("(u+v)'=u'+v'", () => {
        const f = new Formula('((x^3)+(x^2))', ['x']);
        const d = new DiffOperator('x');
        console.log("f", f);
        expect(d.actOn(f).f).toEqual(['+', ['*', 3, ['^', 'x', 2]], ['*', 2, 'x']]);
    });
    it("(u*v)'=u'*v+v'*u", () => {
        const f = new Formula('(x*x)', ['x']);
        const d = new DiffOperator('x');
        console.log("f", f);
        expect(d.actOn(f).f).toEqual(['+', 'x', 'x']);
    });

    it('d(8*(y^x))/dy', () => {
        const f = new Formula('(8*(y^x))', ['x', 'y']);
        expect(f.f).toEqual(['*', 8, ['^', 'y', 'x']]);
        expect(DiffOperator.simplify(DiffOperator.derivative(['*', 8, ['^', 'y', 'x']], 'y'))).toEqual(['*', 8, ['*', 'x', ['^', 'y', ['+', 'x', -1]]]]);
    })

    it('(18*(x^-1))',() => {
        const f = new Formula('(18*(x^-1))', ['x']);
        expect(f.f).toEqual(['*', 18, ['^', 'x', -1]]);
        expect(DiffOperator.simplify(DiffOperator.derivative(f.f, 'x'))).toEqual( ['*', 18, ['*', -1, ['^', 'x', -2]]]);
    });

    it('d(((x^2)+(2*(z^5)))+(((18*(x^-1))+y)+z))/dx', () => {
        const f = new Formula('(((x^2)+(2*(z^5)))+(((18*(x^-1))+y)+z))', ['x', 'y', 'z']);
        expect(DiffOperator.simplify(DiffOperator.derivative(f.f, 'x'))).toEqual(['+', ['*', 2, 'x'], ['*', 18, ['*', -1, ['^', 'x', -2]]]]);
    })
})

describe('e2e', () => {
    it('easy multiply', () => {
        expect(run('(5*(x*y))\nx\nx 2 y 6')).toEqual('30')
    })
    it("second derivative", () => {
        expect(run('(5*((x^4)*(y^2)))\nx x\nx 2 y 6')).toEqual('8640')
    })
    it("second derivative mix", () => {
        expect(run('(5*(x*(y^2)))\ny x\nx 2 y 6')).toEqual('60')
    })
    it("power with number", () => {
        expect(run('((x^2)+(9*(x+y)))\nx\nx 1 y 2')).toEqual('11')
    })
    it("power with variable", () => {
        expect(run('(8*(y^x))\ny y\nx -1 y 2')).toEqual('2')
    })
    it("3 variables", () => {
        expect(run('(((x^2)+(2*(z^5)))+((x+y)+z))\nz\nx 2 y 3 z 4')).toEqual('2561')
    })
    it("fraction", () => {
        expect(run('(((x^2)+(2*(z^5)))+(((18*(x^-1))+y)+z))\nx\nx 3 y 4 z 1')).toEqual('4')
    })
    it("longer multiply", () => {
        expect(run('(((x^2)*(2*(z^5)))*((x+y)+z))\nz\nx 1 y 1 z 1')).toEqual('32')
    })
    it("3rd derivative", () => {
        expect(run('(((y^6)*(z^5))*(((3*(x^4))+y)+z))\ny y z\nx 1 y 1 z 2')).toEqual('16320')
    })
    it("some Greek ;)", () => {
        expect(run('(((Beta^6)*(Gamma^5))*(((3*(Alpha^4))+Beta)+Gamma))\nBeta Beta Gamma\nAlpha 1 Beta 1 Gamma 2')).toEqual('16320')
    })
    it("maybe not xyz ;)", () => {
        expect(run('(((x2^6)*(x3^5))*(((3*(x1^4))+x2)+x3))\nx2 x2 x3\nx1 1 x2 1 x3 2')).toEqual('16320')
    })
    it("some Vars ;)))", () => {
        expect(run('(((Var_2^6)*(Var_3^5))*(((3*(Var_1^4))+Var_2)+Var_3))\nVar_2 Var_2 Var_3\nVar_1 1 Var_2 1 Var_3 2')).toEqual('16320')
    })
    it("bigger constants", () => {
        expect(run('(50*((x^40)*(y^20)))\nx x\nx 1 y 1')).toEqual('78000')
    })
    it("bigger power", () => {
        expect(run('(x^(y^10))\nx x\nx 1 y 2')).toEqual('1047552')
    })
    it("cannot find", () => {
        expect(run('(5*(x*(y^2)))\nz\nx 2 y 6')).toEqual('0')
    })
})
