import { MyWorkflow, type MyWorkflowParams } from "./MyWorkflow";
import type { Env } from "./env";

export default {
  /**
   * This is the standard fetch handler for a Cloudflare Worker
   *
   * Example:
   *
   * http://127.0.0.1:8787/?name=Andrii&age=47
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
      : await env.MY_WORKFLOW.create({
          params: {
            name: url.searchParams.get("name") ?? "",
            age: Number(url.searchParams.get("age") ?? 0),
          },
        });

    return Response.json({
      id: instance.id,
      status: await instance.status(),
    });
  },
} satisfies ExportedHandler<Env>;

export { MyWorkflow };
