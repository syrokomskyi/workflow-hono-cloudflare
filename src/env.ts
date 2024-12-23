import type { MyWorkflowParams } from "./MyWorkflow";

export type Env = {
  // Add your bindings here, e.g. Workers KV, D1, Workers AI, etc.
  MY_WORKFLOW: Workflow<MyWorkflowParams>;
};
