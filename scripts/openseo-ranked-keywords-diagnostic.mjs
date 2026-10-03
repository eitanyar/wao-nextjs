// Zero-credit OpenSEO tool-schema inspection; no callTool invocations.
import { createOpenSeoMcpClient, closeOpenSeoMcpClient } from '../dist/lib/expired-domain-research/openSeoMcp.js';

const handle = await createOpenSeoMcpClient({ mode: 'local' });
try {
  const { tools } = await handle.client.listTools();
  for (const name of ['get_ranked_keywords', 'get_domain_overview']) {
    const tool = tools.find(item => item.name === name);
    if (!tool) throw new Error(`Missing OpenSEO tool: ${name}`);
    console.log(JSON.stringify({ name, description: tool.description, inputSchema: tool.inputSchema }, null, 2));
  }
} finally {
  await closeOpenSeoMcpClient(handle);
}
