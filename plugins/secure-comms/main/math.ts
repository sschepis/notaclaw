/**
 * Complex number implementation for quantum mechanics simulation.
 */
export class Complex {
    constructor(public re: number, public im: number) {}

    add(c: Complex): Complex {
        return new Complex(this.re + c.re, this.im + c.im);
    }

    sub(c: Complex): Complex {
        return new Complex(this.re - c.re, this.im - c.im);
    }

    mul(c: Complex): Complex {
        return new Complex(
            this.re * c.re - this.im * c.im,
            this.re * c.im + this.im * c.re
        );
    }
    
    scale(s: number): Complex {
        return new Complex(this.re * s, this.im * s);
    }
    
    mag(): number {
        return Math.sqrt(this.re * this.re + this.im * this.im);
    }
    
    exp(): Complex {
        const r = Math.exp(this.re);
        return new Complex(r * Math.cos(this.im), r * Math.sin(this.im));
    }
}

/**
 * Complex Vector class.
 */
export class CVector {
    constructor(public data: Complex[]) {}
    
    norm(): number {
        let sum = 0;
        for (const c of this.data) sum += c.mag() ** 2;
        return Math.sqrt(sum);
    }
}

/**
 * Complex Matrix class.
 */
export class CMatrix {
    // Row-major storage
    constructor(public rows: number, public cols: number, public data: Complex[]) {}

    static identity(n: number): CMatrix {
        const data = new Array(n * n).fill(new Complex(0, 0));
        for (let i = 0; i < n; i++) data[i * n + i] = new Complex(1, 0);
        return new CMatrix(n, n, data);
    }

    mul(m: CMatrix): CMatrix {
        if (this.cols !== m.rows) throw new Error("Dimension mismatch");
        const res = new Array(this.rows * m.cols).fill(new Complex(0, 0));
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < m.cols; j++) {
                let sum = new Complex(0, 0);
                for (let k = 0; k < this.cols; k++) {
                    sum = sum.add(this.data[i * this.cols + k].mul(m.data[k * m.cols + j]));
                }
                res[i * m.cols + j] = sum;
            }
        }
        return new CMatrix(this.rows, m.cols, res);
    }
    
    mulVec(v: CVector): CVector {
        if (this.cols !== v.data.length) throw new Error("Dimension mismatch");
        const res = new Array(this.rows).fill(new Complex(0, 0));
        for (let i = 0; i < this.rows; i++) {
            let sum = new Complex(0, 0);
            for (let j = 0; j < this.cols; j++) {
                sum = sum.add(this.data[i * this.cols + j].mul(v.data[j]));
            }
            res[i] = sum;
        }
        return new CVector(res);
    }
    
    add(m: CMatrix): CMatrix {
        const res = this.data.map((c, i) => c.add(m.data[i]));
        return new CMatrix(this.rows, this.cols, res);
    }
    
    scale(s: Complex): CMatrix {
        const res = this.data.map(c => c.mul(s));
        return new CMatrix(this.rows, this.cols, res);
    }
}

// Pauli Matrices
export const SIGMA_X = new CMatrix(2, 2, [new Complex(0,0), new Complex(1,0), new Complex(1,0), new Complex(0,0)]);
export const SIGMA_Y = new CMatrix(2, 2, [new Complex(0,0), new Complex(0,-1), new Complex(0,1), new Complex(0,0)]);
export const SIGMA_Z = new CMatrix(2, 2, [new Complex(1,0), new Complex(0,0), new Complex(0,0), new Complex(-1,0)]);
export const IDENTITY = CMatrix.identity(2);

/**
 * Tensor product of two matrices.
 */
export function tensor(a: CMatrix, b: CMatrix): CMatrix {
    const rows = a.rows * b.rows;
    const cols = a.cols * b.cols;
    const data = new Array(rows * cols);
    
    for (let i = 0; i < a.rows; i++) {
        for (let j = 0; j < a.cols; j++) {
            const val = a.data[i * a.cols + j];
            // Block (i,j) is val * b
            for (let p = 0; p < b.rows; p++) {
                for (let q = 0; q < b.cols; q++) {
                    const subVal = b.data[p * b.cols + q];
                    const r = i * b.rows + p;
                    const c = j * b.cols + q;
                    data[r * cols + c] = val.mul(subVal);
                }
            }
        }
    }
    return new CMatrix(rows, cols, data);
}

/**
 * Quaternion implementation for prime factorization representation.
 */
export class Quaternion {
    constructor(
        public w: number,
        public x: number,
        public y: number,
        public z: number
    ) {}

    add(q: Quaternion): Quaternion {
        return new Quaternion(this.w + q.w, this.x + q.x, this.y + q.y, this.z + q.z);
    }

    multiply(q: Quaternion): Quaternion {
        return new Quaternion(
            this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z,
            this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
            this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
            this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w
        );
    }

    scale(s: number): Quaternion {
        return new Quaternion(this.w * s, this.x * s, this.y * s, this.z * s);
    }

    norm(): number {
        return Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize(): Quaternion {
        const n = this.norm();
        if (n === 0) return new Quaternion(1, 0, 0, 0);
        return this.scale(1 / n);
    }

    conjugate(): Quaternion {
        return new Quaternion(this.w, -this.x, -this.y, -this.z);
    }
    
    // Convert to Bloch vector (x, y, z components normalized)
    toBlochVector(): [number, number, number] {
        const n = this.norm();
        if (n === 0) return [0, 0, 0];
        // Based on PDF: n_p = 1/||q|| * (b, c', d')
        // Our q = a + bi + jc' + kd'
        // So w=a, x=b, y=c', z=d'
        return [this.x / n, this.y / n, this.z / n];
    }
}

export function isPrime(n: number): boolean {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
}

// Find Gaussian integers a^2 + b^2 = p
export function findGaussianFactors(p: number): [number, number] | null {
    for (let a = 1; a * a < p; a++) {
        const b2 = p - a * a;
        const b = Math.round(Math.sqrt(b2));
        if (b * b === b2) {
            return [a, b];
        }
    }
    return null;
}

// Find Eisenstein integers c^2 - cd + d^2 = p
export function findEisensteinFactors(p: number): [number, number] | null {
    // Search for c, d such that c^2 - cd + d^2 = p
    // We can iterate c and solve for d
    // d^2 - cd + (c^2 - p) = 0
    // d = (c +/- sqrt(c^2 - 4(c^2 - p))) / 2
    // d = (c +/- sqrt(4p - 3c^2)) / 2
    // So 4p - 3c^2 must be a perfect square >= 0
    
    // Bounds for c: 3c^2 <= 4p => c^2 <= 4p/3 => c <= sqrt(4p/3)
    const limit = Math.floor(Math.sqrt((4 * p) / 3));
    
    for (let c = 1; c <= limit; c++) {
        const disc = 4 * p - 3 * c * c;
        if (disc < 0) continue;
        const sqrtDisc = Math.round(Math.sqrt(disc));
        if (sqrtDisc * sqrtDisc === disc) {
            // Check if (c + sqrtDisc) is even
            if ((c + sqrtDisc) % 2 === 0) {
                return [c, (c + sqrtDisc) / 2];
            }
            if ((c - sqrtDisc) % 2 === 0) {
                return [c, (c - sqrtDisc) / 2];
            }
        }
    }
    return null;
}

export function createPrimeQuaternion(p: number): Quaternion | null {
    if (!isPrime(p) || p % 12 !== 1) return null;

    const gauss = findGaussianFactors(p);
    const eisen = findEisensteinFactors(p);

    if (!gauss || !eisen) return null;

    const [a, b] = gauss;
    const [c, d] = eisen;

    // From PDF:
    // alpha = a + bi
    // beta = c + d*omega
    // omega = -1/2 + i*sqrt(3)/2
    // beta = c + d(-1/2 + i*sqrt(3)/2) = (c - d/2) + i(d*sqrt(3)/2)
    // q = a + bi + j(real(beta)) + k(imag(beta))
    // q = a + bi + j(c - d/2) + k(d*sqrt(3)/2)
    
    // Note: The PDF says q = a + bi + j(c' + d'i) = a + bi + jc' + k d'
    // where c' = c - d/2, d' = d*sqrt(3)/2
    
    const c_prime = c - d / 2;
    const d_prime = (d * Math.sqrt(3)) / 2;

    return new Quaternion(a, b, c_prime, d_prime);
}
