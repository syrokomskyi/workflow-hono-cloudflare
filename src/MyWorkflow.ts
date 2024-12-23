import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { Env } from "./env";

export type MyWorkflowParams = {
  name: string;
  age: number;
};

// Create your own class that implements a Workflow.
export class MyWorkflow extends WorkflowEntrypoint<Env, MyWorkflowParams> {
  // Define a run() method
  async run(event: WorkflowEvent<MyWorkflowParams>, step: WorkflowStep) {
    console.log("event", event);
    console.log("step", step);

    const payload = event.payload;

    // Define one or more steps that optionally return state.
    const data = await step.do("my first step", async () => {
      return [11, 12, 13];
    });

    await step.sleep("wait on something", "12 seconds");

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
          throw new Error("API call failed. This is a test error.");
        }

        return {
          payload: payload,
          started: event.timestamp,
          stopped: new Date().toISOString(),
          duration: (performance.now() - event.timestamp.getTime()) / 1000,
        };
      },
    );

    await step.do("my final step with data", async () => {
      const r: string[] = [];
      for (const d in data) {
        r.push(`From variable: ${payload.name}-${d}-${payload.age}`);
        r.push(`From event: ${event.payload.name}-${d}-${event.payload.age}`);
        r.push(JSON.stringify(event));
      }

      return { final_result: r, event };
    });
  }
}
