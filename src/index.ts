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

    // Spawn a new instance or return the spawned early instance
    const id = url.searchParams.get("id");
    const instance = id
      ? await env.MY_WORKFLOW.get(id)
      : await env.MY_WORKFLOW.create();

    return Response.json({
      id: instance.id,
      status: await instance.status(),
    });
  },
} satisfies ExportedHandler<Env>;

export { MyWorkflow };
