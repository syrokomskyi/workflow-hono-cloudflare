import {
  DurableObject,
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";

type Env = {
  // Add your bindings here, e.g. Workers KV, D1, Workers AI, etc.
  MY_DURABLE_OBJECT: DurableObjectNamespace<MyDurableObject>;
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

/** A Durable Object's behavior is defined in an exported Javascript class */
export class MyDurableObject extends DurableObject {
  readonly name: string;

  /**
   * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
   * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
   *
   * @param ctx - The interface for interacting with Durable Object state
   * @param env - The interface to reference bindings declared in wrangler.toml
   */
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.name = `DO ${crypto.randomUUID()}`;
  }

  /**
   * The Durable Object exposes an RPC method sayHello which will be invoked when when a Durable
   *  Object instance receives a request from a Worker via the same method invocation on the stub
   *
   * @returns The greeting to be sent back to the Worker
   */
  async sayHello(): Promise<string> {
    return `Hello, ${this.name}!`;
  }
}

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

    // We will create a `DurableObjectId` using the pathname from the Worker request
    // This id refers to a unique instance of our 'MyDurableObject' class above
    const stateId = env.MY_DURABLE_OBJECT.idFromName(url.pathname);

    // This stub creates a communication channel with the Durable Object instance
    // The Durable Object constructor will be invoked upon the first call for a given id
    const stub = env.MY_DURABLE_OBJECT.get(stateId);

    return Response.json({
      instance: {
        id: instance.id,
        details: await instance.status(),
      },
      state: {
        id: stateId,
        name: await stub.sayHello(),
      },
    });
  },
} satisfies ExportedHandler<Env>;
