
import { Quaternion, createPrimeQuaternion, isPrime, Complex, CMatrix, CVector, SIGMA_X, SIGMA_Y, SIGMA_Z, IDENTITY, tensor } from './math';

// Pre-computed primes congruent to 1 mod 12
const PRIMES = [
    13, 37, 61, 73, 97, 109, 157, 181, 193, 229
];

function matrixExp(m: CMatrix): CMatrix {
    // Taylor series: I + M + M^2/2! + ...
    let term = CMatrix.identity(m.rows);
    let sum = term;
    
    for (let i = 1; i < 20; i++) {
        term = term.mul(m).scale(new Complex(1/i, 0));
        sum = sum.add(term);
    }
    return sum;
}

class CoupledSystem {
    private state: CVector;
    private U_step: CMatrix;
    private currentStep: number = 0;
    private dt: number = 0.01; // Step size
    private p1: number;
    private p2: number;

    constructor(p1: number, p2: number) {
        this.p1 = p1;
        this.p2 = p2;
        
        const q1 = createPrimeQuaternion(p1);
        const q2 = createPrimeQuaternion(p2);
        
        if (!q1 || !q2) throw new Error("Invalid primes");

        // Construct Hamiltonians
        // H = x*sx + y*sy + z*sz
        // q = a + bi + jc' + kd' => x=b, y=c', z=d'
        const h1 = SIGMA_X.scale(new Complex(q1.x, 0))
            .add(SIGMA_Y.scale(new Complex(q1.y, 0)))
            .add(SIGMA_Z.scale(new Complex(q1.z, 0)));
            
        const h2 = SIGMA_X.scale(new Complex(q2.x, 0))
            .add(SIGMA_Y.scale(new Complex(q2.y, 0)))
            .add(SIGMA_Z.scale(new Complex(q2.z, 0)));
            
        // Interaction gamma
        const gamma = 5.0; // Strong interaction
        const interaction = tensor(SIGMA_Z, SIGMA_Z).scale(new Complex(gamma, 0));
        
        // Total H = H1 x I + I x H2 + Interaction
        const H = tensor(h1, IDENTITY).add(tensor(IDENTITY, h2)).add(interaction);
        
        // U_step = exp(-i * H * dt)
        const M = H.scale(new Complex(0, -this.dt));
        this.U_step = matrixExp(M);
        
        // Initial state: |00> = [1, 0, 0, 0]
        this.state = new CVector([
            new Complex(1, 0),
            new Complex(0, 0),
            new Complex(0, 0),
            new Complex(0, 0)
        ]);
    }

    public step() {
        this.state = this.U_step.mulVec(this.state);
        this.currentStep++;
    }
    
    public getByte(): number {
        // Map state to byte using a hash of all components
        // to ensure better coverage of the value space
        let hash = 0;
        for (const c of this.state.data) {
            // Mix real and imaginary parts
            hash = (hash + Math.abs(c.re) * 1000 + Math.abs(c.im) * 1000) % 256;
        }
        return Math.floor(hash);
    }
    
    public getTime(): number {
        return this.currentStep * this.dt;
    }
    
    public reset(t: number) {
        // Reset to t=0 state and step until t
        // Optimization: For now, just reset to 0
        // In production, we'd use exact evolution U(t)
        this.state = new CVector([
            new Complex(1, 0),
            new Complex(0, 0),
            new Complex(0, 0),
            new Complex(0, 0)
        ]);
        
        // Snap t to nearest step
        const steps = Math.round(t / this.dt);
        this.currentStep = 0;
        
        for(let i=0; i<steps; i++) {
             this.state = this.U_step.mulVec(this.state);
             this.currentStep++;
        }
    }
}

export class SecureChannel {
    private system: CoupledSystem;

    constructor() {
        this.system = new CoupledSystem(13, 37);
    }

    public encode(byte: number, startT: number): number {
        // Sync system to startT
        this.system.reset(startT);
        
        const timeout = 20000; // steps
        let minVal = 255;
        let maxVal = 0;
        
        for (let i = 0; i < timeout; i++) {
            this.system.step();
            const val = this.system.getByte();
            if (val < minVal) minVal = val;
            if (val > maxVal) maxVal = val;
            
            if (val === byte) {
                return this.system.getTime();
            }
        }
        
        console.log(`[Secure Comms] Encode failed for ${byte}. Range seen: [${minVal}, ${maxVal}]`);
        throw new Error(`Could not find encoding for byte ${byte}`);
    }

    public decode(t: number): number | null {
        this.system.reset(t);
        // We need to be exactly at t.
        // Since we use steps, t must be a multiple of dt.
        // Or we interpolate.
        // For this proof of concept, assume t is returned from encode, so it's on grid.
        return this.system.getByte();
    }
}
