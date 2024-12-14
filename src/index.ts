import { MyWorkflow } from "./MyWorkflow";

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

export { MyWorkflow };
