import {Coordinate, DiffOperator, Formula, round, run} from "../lib";

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

    it('parse', () => {
        const f = new Formula('(5*(x*y))', ['x', 'y']);

        expect(f.f).toEqual(['*', 5, 'x', 'y']);
        expect(f.v).toEqual(['x', 'y']);
    });

    it('parse with many brackets', () => {
        const f = new Formula('((x^3)+(x^2))', ['x']);
        expect(f.f).toEqual(['+', ['^', 'x', 3], ['^', 'x', 2]])
    })

    it('evaluate', () => {
        const f = new Formula('(5*(x*y))', ['x', 'y']);

        expect(f.evaluate(new Coordinate('x 1 y 2'))).toStrictEqual(10);
    });

    it('evaluate exp', () => {
        const f = new Formula('ln e', []);
        expect(f.evaluate(new Coordinate(''))).toStrictEqual(1);
    });

    it('simplify arrays', () => {
        expect(Formula.simplify([
            '+',
            ['+', ['^', 'x', 2], ['*', 2, ['^', 'z', 5]]],
        ])).toEqual(['+', ['^', 'x', 2], ['*', 2, ['^', 'z', 5]]])
        expect(Formula.simplify([
            '+',
            ['+', ['^', 'x', 2], ['*', 2, ['^', 'z', 5]]],
            ['+', 'x', 'y']
        ])).toEqual(['+', ['+', 'x', 'y'], ['^', 'x', 2], ['*', 2, ['^', 'z', 5]]])
        expect(Formula.simplify(Formula.simplify([
            '+',
            ['+', ['^', 'x', 2], ['*', 2, ['^', 'z', 5]]],
            ['+', ['+', 'x', 'y'], 'z']
        ]))).toEqual(['+', ['^', 'x', 2], ['*', 2, ['^', 'z', 5]], 'z', 'x', 'y'])
    })
})
describe('diff operation', () => {
    it('simplify', () => {
        expect(DiffOperator.simplify(["+", ["*", 1, 0], ["*", 0, 1]])).toEqual(0);
        expect(DiffOperator.simplify(['^', 'x', 1])).toEqual('x');
        expect(DiffOperator.simplify(['*', 2, ['^', 'x', 1]])).toEqual(['*', 2, 'x']);
        expect(DiffOperator.simplify(["*", 5, ["+", ["*", "x", 0], ["*", 1, "y"]]])).toEqual(['*', 5, 'y'])
        expect(DiffOperator.simplify(["+", ["*", 5, ["+", ["*", "x", 0], ["*", 1, "y"]]], ["*", 0, ["*", "x", "y"]]]))
            .toEqual(['*', 5, 'y']);
        expect(DiffOperator.simplify(["+", ["*", 0, "x"], ["*", 1, 2]])).toEqual(2);
        expect(DiffOperator.simplify(['*', 1, 5, 'y'])).toEqual(['*', 5, 'y']);
        expect(DiffOperator.simplify(['*', 2, 5, 'y'])).toEqual(['*', 10, 'y']);
        expect(DiffOperator.simplify(['+', 'a', 'b', 0, 'c', 0])).toEqual(['+', 'a', 'b', 'c'])
        expect(DiffOperator.simplify(['*', ['ln', 'z'], 0]))
            .toEqual(0)
        expect(DiffOperator.simplify(['*', ['*', ['ln', 'z'], 0], 2]))
            .toEqual(0)
        expect(DiffOperator.simplify(['*', ['*', ['^', 'z', 5], ['ln', 'z'], 0], 2]))
            .toEqual(0)
        expect(DiffOperator.simplify([
            '+',
            ['*', 2, ['^', 'x', 1]],
            [
                '+',
                ['*', 0, ['^', 'z', 5]],
                ['*', ['*', ['^', 'z', 5], ['ln', 'z'], 0], 2]
            ],
            0,
            [
                '+',
                ['*', 0, ['^', 'x', -1]],
                ['*', ['*', -1, ['^', 'x', -2]], 18]
            ],
            0
        ])).toEqual(['+',
            ['*', 2, 'x'],
            ['*', 18, -1, ['^', 'x', -2]]
        ])
    });
    it('derivative', () => {
        expect(DiffOperator.derivative(['*', 2, 'x'], 'x')).toEqual(["+", ["*", 0, "x"], ["*", 1, 2]]);
        expect(DiffOperator.simplify(DiffOperator.derivative(['*', 2, 'x'], 'x'))).toEqual(2);
        expect(DiffOperator.simplify(DiffOperator.derivative(['*', 2, 'x'], 'x'))).toEqual(2);
        expect(DiffOperator.simplify(DiffOperator.derivative(['*', 5, ['*', 'x', 'y']], 'x'))).toEqual(['*', 'y', 5])
        expect(DiffOperator.simplify(DiffOperator.derivative(['+', ['^', 'x', 2], ['*', 2, ['^', 'z', 5]], 'z', 'x', 'y'], 'z')))
            .toEqual(['+', 1, ['*', ['*', 5, ['^', 'z', 4]], 2]])
    })
    it('log DiffOperator', () => {
        expect(DiffOperator.derivative(['ln', 'x'], 'x'))
            .toEqual(['^', 'x', -1]);
        expect(DiffOperator.derivative(['ln', ['ln', 'x']], 'x'))
            .toEqual(['*', ['^', ['ln', 'x'], -1], ['^', 'x', -1]]);
    })
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
    // e^(x^2)
    it("(n^x)' = n^x ln n", () => {
        expect(DiffOperator.derivative(['^', 'n', 'x'], 'x'))
            .toEqual(['*', ['^', 'n', 'x'], ['ln', 'n']]);
    });
    it("(e^(x^2))' = e^(x^2) 2 x", () => {
        expect(DiffOperator.simplify(DiffOperator.derivative(['^', 'e', ['^', 'x', 2]], 'x')))
            .toEqual(['*', ['^', 'e', ['^', 'x', 2]], ['ln', 'e'], ['*', 2, 'x']]);
    });
    it("(u+v)'=u'+v for (x+(x^2))'", () => {
        const f = new Formula('(x+(x^2))', ['x']);
        const d = new DiffOperator('x');
        expect(d.actOn(f).f).toEqual(['+', 1, ['*', 2, 'x']]);
    });

    it('(((x^2)+(2*(z^5)))+((x+y)+z))', () => {
        const f = new Formula('(((x^2)+(2*(z^5)))+((x+y)+z))', ['x', 'y', 'z']);
        console.dir(f.f, {depth: 7});
        expect(f.f).toEqual(['+', ['+', 'z', 'x', 'y'], ['^', 'x', 2], ['*', 2, ['^', 'z', 5]]])
        const d = new DiffOperator('z');
        expect(d.actOn(f).f).toEqual(['+', 1, ['*', ['*', 5, ['^', 'z', 4]], 2]]);
    })

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
        expect(DiffOperator.simplify(DiffOperator.derivative(['*', 8, ['^', 'y', 'x']], 'y')))
            .toEqual(['*', ['*', 'x', ['^', 'y', ['+', 'x', -1]]], 8]);
    })

    it('(18*(x^-1))', () => {
        const f = new Formula('(18*(x^-1))', ['x']);
        expect(f.f).toEqual(['*', 18, ['^', 'x', -1]]);
        expect(DiffOperator.simplify(DiffOperator.derivative(f.f, 'x')))
            .toEqual(['*', ['*', -1, ['^', 'x', -2]], 18]);
    });

    it('isParsableAsNumber', () => {
        expect(Formula.isParsableAsNumber('1')).toEqual(true);
        expect(Formula.isParsableAsNumber('-1')).toEqual(true);
        expect(Formula.isParsableAsNumber('18')).toEqual(true);
    })

    it('d(((x^2)+(2*(z^5)))+(((18*(x^-1))+y)+z))/dx', () => {
        const f = new Formula('(((x^2)+(2*(z^5)))+(((18*(x^-1))+y)+z))', ['x', 'y', 'z']);
        expect(f.f).toEqual([
            '+',
            ['+', 'z', ['*', 18, ['^', 'x', -1]], 'y'],
            ['^', 'x', 2],
            ['*', 2, ['^', 'z', 5]]
        ])
        expect(DiffOperator.simplify(DiffOperator.derivative(f.f, 'x')))
            .toEqual(['+', ['*', 18,  -1, ['^', 'x', -2]], ['*', 2, 'x']]);
    })

    it('a+b', () => {
        expect(new Formula('a+b', ["a", "b"]).v).toContain('a');
        expect(new Formula('a+b', ["a", "b"]).v).toContain('b');
        expect(new Formula('a+b', ["a", "b"]).f).toEqual(['+', 'a', 'b']);
    })

    it('a+b+c', () => {
        expect(new Formula('a+b+c', ["a", "b", 'c']).v).toContain('a');
        expect(new Formula('a+b+c', ["a", "b", 'c']).v).toContain('b');
        expect(new Formula('a+b+c', ["a", "b", 'c']).v).toContain('c');
        expect(new Formula('a+b+c', ["a", "b", 'c']).f).toEqual(['+', 'a', 'b', 'c']);
    })

    it('a+b*c', () => {
        expect(new Formula('a+b*c', ["a", "b", 'c']).f).toEqual(['+', 'a', ['*', 'b', 'c']]);
    })


    it('a+b*c*d+e', () => {
        expect(new Formula('a+b*c*d+e', ["a", "b", 'c', 'd', 'e']).f)
            .toEqual(['+', 'a', ['*', 'b', 'c', 'd'], 'e']);
    });

    it('ln x', () => {
        expect(new Formula('ln x', ["x"]).f)
            .toEqual(['ln', 'x']);
    });

    it('ln ln x', () => {
        expect(new Formula('ln ln x', ["x"]).f)
            .toEqual(['ln', ['ln', 'x']]);
    });

    it('ln ln ln x', () => {
        expect(new Formula('ln ln ln x', ["x"]).f)
            .toEqual(['ln', ['ln', ['ln', 'x']]]);
    });

    it('ln ln ln ln x', () => {
        expect(new Formula('ln ln ln ln x', ["x"]).f)
            .toEqual(['ln', ['ln', ['ln', ['ln', 'x']]]]);
    });

    it('cos x', () => {
        expect(new Formula('cos x', ["x"]).f)
            .toEqual(['cos', 'x']);
    });

    it('ln sin ln cos x', () => {
        expect(new Formula('ln sin ln cos x', ["x"]).f)
            .toEqual(['ln', ['sin', ['ln', ['cos', 'x']]]]);
    });

    it('(a+b)', () => {
        expect(new Formula('(a+b)', ["a", "b"]).f).toEqual(['+', 'a', 'b']);
    })

    it('(5*(x*y))', () => {
        expect(new Formula('(5*(x*y))', ["x", "y"]).f)
            .toEqual(['*', 5, 'x', 'y']);
    })

    it('simplify empty array', () => {
        expect(Formula.simplify([['+', 'a', 'b']])).toEqual(['+', 'a', 'b'])
    })

    it('simplify the same operators on different levels', () => {
        expect(Formula.simplify([['+', 'a', ['+', 'b', 'c']]])).toEqual(['+', 'a', 'b', 'c'])
    })

    it('(5*((x^4)*(y^2)))', () => {
        expect(new Formula('(5*((x^4)*(y^2)))', ["x", "y"]).f)
            .toEqual(['*', 5, ['^', 'x', 4], ['^', 'y', 2]]);
    });

    it('(x^-1)', () => {
        expect(new Formula('(x^-1)', ["x"]).f)
            .toEqual(['^', 'x', -1]);
    })

    it('(x^(y^10))', () => {
        expect(new Formula('(x^(y^10))', ['x', 'y']).f)
            .toEqual(['^', 'x', ['^', 'y', 10]])
    });

    it('(sin x)^(sin x)', () => {
        expect(new Formula('(sin x)^(sin x)', ['x']).f)
            .toEqual(['^', ['sin', 'x'], ['sin', 'x']])
    })

    it('pileUpPowerArgs', () => {
        expect(Formula.pileUpPowerArgs(['a', 'b', 'c', 'd', 'e']))
            .toEqual(['^', 'a', ['^', 'b', ['^', 'c', ['^', 'd', 'e']]]])
    })

    it('a^b^c', () => {
        expect(new Formula('a^b^c', ['a', 'b', 'c']).f)
            .toEqual([
                '^',
                'a',
                ['^', 'b', 'c']
            ])
    });

    it('simplify powers', () => {
        expect(Formula.simplify(['*', 'a', ['^', 'b', 'c', 'd']]))
            .toEqual(['*', 'a', ['^', 'b', ['^', 'c', 'd']]])
    });

    it('a*b^c^d', () => {
        expect(new Formula('a*b^c^d', ['a', 'b', 'c', 'd']).f)
            .toEqual(['*', 'a', [
                '^',
                'b',
                ['^', 'c', 'd']
            ]])
    });

    it('2*z^x^sin y*z', () => {
        expect(new Formula('2*z^x^sin y*z', ['x', 'y', 'z']).f)
            .toEqual(['*', 2, [
                '^',
                'z',
                ['^', 'x', ['sin', 'y']]
            ], 'z'])
    });

    it('y + 2*z^x^sin y*z + y* cos pi^2 * ln x', () => {
        expect(new Formula('y+2*z^x^sin y*z+y*cos pi^2*ln x', ['x', 'y', 'z']).f)
            .toEqual([
                '+',
                'y',
                ['*', 2, ['^', 'z', ['^', 'x', ['sin', 'y']]], 'z'],
                ['*', 'y', ['^', ['cos', 'pi'], 2], ['ln', 'x']]
            ])
    })

})
// ln(ln(ln(ln x)))
// [ ln, [ln, [ln, x] ] ]

// 5*sin x*y^-2
// [ *, 5, [ sin , x], [^, y, [-,2]]]


describe('e2e', () => {
    it('easy multiply', () => {
        expect(run('(5*(x*y))\nx\nx 2 y 6')).toEqual('30.00')
    })
    it("second derivative", () => {
        expect(run('(5*((x^4)*(y^2)))\nx x\nx 2 y 6')).toEqual('8640.00')
    })
    it("second derivative mix", () => {
        expect(run('(5*(x*(y^2)))\ny x\nx 2 y 6')).toEqual('60.00')
    })
    it("power with number", () => {
        expect(run('((x^2)+(9*(x+y)))\nx\nx 1 y 2')).toEqual('11.00')
    })
    it("power with variable", () => {
        expect(run('(8*(y^x))\ny y\nx -1 y 2')).toEqual('2.00')
    })
    it("3 variables", () => { // 2 * 5 * z^4 = 10 * 4 ^ 4
        expect(run('(((x^2)+(2*(z^5)))+((x+y)+z))\nz\nx 2 y 3 z 4')).toEqual('2561.00')
    })
    it("fraction rational", () => {
        expect(run('(((x^2)+(2*(z^5)))+(((18*(x^-1))+y)+z))\nx\nx 3 y 4 z 1'))
            .toEqual('4.00')
    })
    it("longer multiply", () => {
        expect(run('(((x^2)*(2*(z^5)))*((x+y)+z))\nz\nx 1 y 1 z 1')).toEqual('32.00')
    })
    it("3rd derivative", () => {
        expect(run('(((y^6)*(z^5))*(((3*(x^4))+y)+z))\ny y z\nx 1 y 1 z 2'))
            .toEqual('16320.00')
    })
    it("some Greek ;)", () => {
        expect(run('(((Beta^6)*(Gamma^5))*(((3*(Alpha^4))+Beta)+Gamma))\nBeta Beta Gamma\nAlpha 1 Beta 1 Gamma 2'))
            .toEqual('16320.00')
    })
    it("maybe not xyz ;)", () => {
        expect(run('(((x2^6)*(x3^5))*(((3*(x1^4))+x2)+x3))\nx2 x2 x3\nx1 1 x2 1 x3 2'))
            .toEqual('16320.00')
    })
    it("some Vars ;)))", () => {
        expect(run('(((Var_2^6)*(Var_3^5))*(((3*(Var_1^4))+Var_2)+Var_3))\nVar_2 Var_2 Var_3\nVar_1 1 Var_2 1 Var_3 2'))
            .toEqual('16320.00')
    })
    it("bigger constants", () => {
        expect(run('(50*((x^40)*(y^20)))\nx x\nx 1 y 1')).toEqual('78000.00')
    })
    it("bigger power", () => {
        expect(run('(x^(y^10))\nx x\nx 1 y 2')).toEqual('1047552.00')
    })
    it("cannot find", () => {
        expect(run('(5*(x*(y^2)))\nz\nx 2 y 6')).toEqual('0.00')
    })
    it('crazy ln chain', () => {
        expect(new Formula('ln(ln(ln(ln x)))', ['x']).f)
            .toEqual(['ln', ['ln', ['ln', ['ln', 'x']]]])
        expect(run('ln(ln(ln(ln x)))\n' +
            'x\n' +
            'x 15.16')).toEqual('174.23')
    })
    it('interesting powers', () => {
        expect(run('e^(x^2)\nx\nx 1.00')).toEqual(round(2 * Math.E).toFixed(2))
        expect(run('4^(x^e)\nx\nx 1.00')).toEqual(round(4 * Math.E * Math.log(4)).toFixed(2))
        expect(run('(5*x)^2\nx\nx 1.00')).toEqual('50.00')
        expect(run('(sin x)^(sin x)\nx\nx 1.00')).toEqual(round(0.38661).toFixed(2))

        expect(run('e^(x^2)+4^(x^e)+(5*x)^2+(sin x)^(sin x)\n' +
            'x\n' +
            'x 1.00')).toEqual('70.90')
    })
    it('2nd deriv', () => {
        expect(run('(cos pi+2*ln e)*0.50*x*y^2+z\n' +
            'y x\n' +
            'x 2.00 y 5.00 z 0.00')).toEqual('5.00')
    })
    it('fraction', () => {
        expect(run('(sin x^-2+pi^-1)^-1\n' +
            'x\n' +
            'x 3.00')).toEqual('-0.28')
    })
    it('3rd', () => {
        expect(run('e^x\n' +
            'x x x\n' +
            'x 1.00')).toEqual('2.72')
    })
    it('parse', () => {
        expect(run('y+2*z^x^sin y*z+y*cos pi^2*ln x\n' +
            // expect(run('y+2*z^(x^sin y)*z+y*cos pi^2*ln x\n' +
            'x\n' +
            'x 2.72 y 2.00 z 3.00')).toEqual('84.58')
    })
    it('diversified vars', () => {
        expect(run('Var_1+3*Var_1^ln Gamma^cos(2*pi)*y3+y3*sin pi^4*e^Gamma\n' +
            'Gamma\n' +
            'Gamma 1.00 y3 2.00 Var_1 3.00')).toEqual('6.59')
    })
})
