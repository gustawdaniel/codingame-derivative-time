import {run} from "../lib";

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
    it( "3rd derivative", () => {
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
