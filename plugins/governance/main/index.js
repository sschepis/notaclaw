"use strict";
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

// plugins/governance/src/index.ts
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var activate = async (context) => {
  console.log("[Governance Console] Main process activated");
  const proposals = /* @__PURE__ */ new Map();
  const loadProposals = async () => {
    const stored = await context.storage.get("proposals");
    if (stored) {
      Object.values(stored).forEach((p) => proposals.set(p.id, p));
    }
  };
  const saveProposals = async () => {
    const obj = {};
    proposals.forEach((value, key) => {
      obj[key] = value;
    });
    await context.storage.set("proposals", obj);
  };
  await loadProposals();
  context.dsn.registerTool({
    name: "submit_proposal",
    description: "Submit a new governance proposal",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        creator: { type: "string" }
      },
      required: ["title", "description", "creator"]
    },
    semanticDomain: "meta",
    primeDomain: [17],
    smfAxes: [0.8],
    requiredTier: "Adept",
    version: "1.0.0"
  }, async (args) => {
    const id = "prop_" + Date.now();
    const proposal = {
      id,
      title: args.title,
      description: args.description,
      creator: args.creator,
      status: "active",
      votes: { yes: 0, no: 0 },
      deadline: Date.now() + 7 * 24 * 60 * 60 * 1e3
      // 1 week
    };
    proposals.set(id, proposal);
    await saveProposals();
    return { status: "submitted", proposal };
  });
  context.dsn.registerTool({
    name: "vote_proposal",
    description: "Vote on an active proposal",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        proposalId: { type: "string" },
        vote: { type: "string", enum: ["yes", "no"] },
        voter: { type: "string" }
      },
      required: ["proposalId", "vote", "voter"]
    },
    semanticDomain: "meta",
    primeDomain: [17],
    smfAxes: [0.6],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async (args) => {
    const proposal = proposals.get(args.proposalId);
    if (!proposal) return { status: "error", message: "Proposal not found" };
    if (proposal.status !== "active") return { status: "error", message: "Proposal not active" };
    if (Date.now() > proposal.deadline) {
      proposal.status = proposal.votes.yes > proposal.votes.no ? "passed" : "rejected";
      await saveProposals();
      return { status: "error", message: "Voting closed" };
    }
    if (args.vote === "yes") proposal.votes.yes++;
    if (args.vote === "no") proposal.votes.no++;
    await saveProposals();
    return { status: "voted", proposal };
  });
  context.on("ready", () => {
    console.log("[Governance Console] Ready");
  });
};
var deactivate = () => {
  console.log("[Governance Console] Deactivated");
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
