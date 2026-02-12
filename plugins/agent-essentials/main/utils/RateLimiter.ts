export class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private maxTokens: number;
    private refillRate: number; // tokens per second

    constructor(maxTokens: number, refillRate: number) {
        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
    }

    private refill() {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        const newTokens = elapsed * this.refillRate;

        if (newTokens > 0) {
            this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
            this.lastRefill = now;
        }
    }

    public tryConsume(tokens: number = 1): boolean {
        this.refill();
        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }
        return false;
    }

    public async waitForToken(tokens: number = 1): Promise<void> {
        while (!this.tryConsume(tokens)) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}
