
class VolumeSpike {
  constructor() {
    this.name = 'Volume Spike';
    this.description = 'Detects unusual volume spikes in short timeframes';
    this.enabled = true;
    this.weight = 1.0;
  }

  async evaluate(opportunity) {
    // Simple logic: if volume > 1M, high confidence
    // In reality, compare to moving average
    if (opportunity.volume > 1000000) return 0.9;
    if (opportunity.volume > 500000) return 0.7;
    return 0.3;
  }
}

module.exports = VolumeSpike;
