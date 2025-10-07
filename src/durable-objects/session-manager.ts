// Durable Object for MCP session management

export class MCPSessionManager {
  private state: DurableObjectState;
  private sessions: Map<string, any> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    if (request.method === 'GET') {
      // Get session data
      let session = this.sessions.get(sessionId);

      if (!session) {
        session = await this.state.storage.get(sessionId);
        if (session) {
          this.sessions.set(sessionId, session);
        }
      }

      return Response.json({ session: session || null });
    }

    if (request.method === 'POST') {
      // Create/update session
      const data = await request.json();
      this.sessions.set(sessionId, data);
      await this.state.storage.put(sessionId, data);
      return Response.json({ success: true });
    }

    if (request.method === 'DELETE') {
      // Delete session
      this.sessions.delete(sessionId);
      await this.state.storage.delete(sessionId);
      return Response.json({ success: true });
    }

    return new Response('Method not allowed', { status: 405 });
  }
}
