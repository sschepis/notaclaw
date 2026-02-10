
class Sentiment {
  constructor(context) {
    this.context = context;
    this.name = 'AI Sentiment Analysis';
    this.description = 'Analyzes market sentiment using AI';
    this.enabled = true;
    this.weight = 1.2;
  }

  async evaluate(opportunity) {
    // Simulate fetching social data
    // In a real app, you would fetch from Twitter/X API or a news aggregator
    const socialData = `
      Recent chatter for ${opportunity.symbol} on ${opportunity.chain}:
      - Volume is increasing significantly.
      - Community is discussing a potential partnership.
      - Some users are taking profits, but overall trend looks positive.
      - Price action is volatile.
    `;

    try {
      if (this.context.ai && this.context.ai.complete) {
        const prompt = `
          You are a crypto trading expert. Analyze the sentiment for the following token.
          
          Token: ${opportunity.symbol} (${opportunity.chain})
          Context: "${socialData}"
          
          Task: Determine a bullish/bearish score between 0.0 (extremely bearish) and 1.0 (extremely bullish).
          0.5 is neutral.
          
          Return ONLY a JSON object in this format:
          {
            "score": 0.75,
            "reason": "Short explanation"
          }
        `;

        const response = await this.context.ai.complete({
          prompt,
          model: 'gemini-3-pro-preview', // Prefer fast model
          temperature: 0.1
        });

        // Parse response (handling potential markdown code blocks)
        let text = response.text || response.content;
        if (!text) return 0.5;
        
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            const result = JSON.parse(text);
            // console.log(`[Sentiment] ${opportunity.symbol}: ${result.score} (${result.reason})`);
            return result.score || 0.5;
        } catch (e) {
            console.warn('[Sentiment] Failed to parse AI response:', text);
            return 0.5;
        }
      } else {
          // console.warn('[Sentiment] AI provider not available');
          return 0.5;
      }
    } catch (error) {
      console.error('[Sentiment] Analysis failed:', error);
      return 0.5; // Fail safe
    }
  }
}

module.exports = Sentiment;
