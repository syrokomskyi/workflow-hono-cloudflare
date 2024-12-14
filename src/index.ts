import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";

type Env = {
  // Add your bindings here, e.g. Workers KV, D1, Workers AI, etc.
  MY_WORKFLOW: Workflow;
};

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

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

export default {
  /**
   * This is the standard fetch handler for a Cloudflare Worker
   *
   * @param request - The request submitted to the Worker from the client
   * @param env - The interface to reference bindings declared in wrangler.toml
   * @param ctx - The execution context of the Worker
   * @returns The response to be sent back to the client
   */
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // Demo for catching a request to /favicon
    if (url.pathname.startsWith("/favicon")) {
      return Response.json({}, { status: 404 });
    }

    // Get the status of an existing instance, if provided
    const instanceId = url.searchParams.get("instanceId");
    if (instanceId) {
      const instance = await env.MY_WORKFLOW.get(instanceId);
      return Response.json({
        status: await instance.status(),
      });
    }

    // Spawn a new instance and return the ID and status
    const instance = await env.MY_WORKFLOW.create();

    return Response.json({
      instance: {
        id: instance.id,
        details: await instance.status(),
      },
    });
  },
} satisfies ExportedHandler<Env>;
