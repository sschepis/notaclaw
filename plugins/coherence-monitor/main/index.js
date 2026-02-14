var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/coherence-monitor/main/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var interval;
var index_default = {
  activate: (context) => {
    console.log("[Coherence Monitor] Main process activated");
    const startMonitoring = () => {
      console.log("[Coherence Monitor] Ready");
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        const coherence = Math.random();
        const entropy = Math.random() * 0.5;
        const event = {
          timestamp: Date.now(),
          coherence,
          entropy,
          source: "SRIA-Core",
          message: coherence > 0.8 ? "High coherence achieved" : "Entropy increasing"
        };
        context.ipc.send("coherence:update", event);
      }, 3e3);
    };
    context.on("ready", startMonitoring);
    context.on("stop", () => {
      if (interval) clearInterval(interval);
    });
    if (context.traits) {
      context.traits.register({
        id: "coherence-monitoring",
        name: "Coherence Monitoring",
        description: "Monitor system coherence and entropy.",
        instruction: "You can monitor the coherence and entropy levels of the system. This data helps in understanding the stability and organization of the agent network.",
        activationMode: "dynamic",
        triggerKeywords: ["coherence", "entropy", "stability", "monitor", "system health"]
      });
    }
  },
  deactivate: () => {
    console.log("[Coherence Monitor] Deactivated");
    if (interval) clearInterval(interval);
  }
};
