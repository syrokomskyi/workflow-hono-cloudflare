import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";

// Create your own class that implements a Workflow
export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
  // Define a run() method
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    // Define one or more steps that optionally return state.
    const data = await step.do("my first step", async () => {
      return [1, 2, 3];
    });

    await step.sleep("wait on something", "20 seconds");

    await step.do(
      "make a call to write that could maybe, just might, fail",
      // retry strategy
      {
        retries: {
          limit: 5,
          delay: "5 second",
          backoff: "exponential",
        },
        timeout: "15 minutes",
      },
      async () => {
        // Do stuff here, with access to the state from our previous steps
        if (Math.random() > 0.5) {
          throw new Error("API call to $STORAGE_SYSTEM failed");
        }
      },
    );

    await step.do("my final step with data", async () => {
      for (const d in data) {
        // Do something with your state
      }

      return { completed: data };
    });
  }
}
