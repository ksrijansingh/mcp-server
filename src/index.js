// src/index.js
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const PORT = process.env.MCP_SERVER_PORT || 4000;
const app = express();
app.use(bodyParser.json());

/**
 * Tool descriptors: names, description, and JSON schema for input.
 * Adapt schemas to your Mule flows.
 */
const tools = {
  retrieveAppointment: {
    name: "retrieveAppointment",
    description: "Retrieve appointment by id",
    inputSchema: {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "appointmentId": { "type": "string" }
      },
      "required": ["appointmentId"]
    }
  },
  modifyAppointment: {
    name: "modifyAppointment",
    description: "Modify appointment date/time",
    inputSchema: {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "appointmentId": { "type": "string" },
        "appointmentDate": { "type": "string" },
        "appointmentTime": { "type": "string" }
      },
      "required": ["appointmentId","appointmentDate","appointmentTime"]
    }
  }
};

// Simple health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Return tool descriptors (so Copilot OR a human can inspect)
app.get('/tools', (req, res) => {
  res.json({ tools });
});

// Invoke a tool: this endpoint will act as a bridge to your Mule app.
// By default it forwards to Mule HTTP endpoints (change muleBaseUrl as needed).
const muleBaseUrl = process.env.MULE_BASE_URL || 'http://localhost:8081';

app.post('/invoke/:toolName', async (req, res) => {
  const toolName = req.params.toolName;
  const payload = req.body || {};
  console.log(`[MCP] Invoke ${toolName} payload:`, JSON.stringify(payload));

  if(!tools[toolName]) {
    return res.status(404).json({ error: `Unknown tool ${toolName}` });
  }

  // Example mapping: call Mule endpoints
  try {
    if (toolName === 'retrieveAppointment') {
      // Mule GET style (change as per your Mule flow)
      const resp = await fetch(`${muleBaseUrl}/mcp/retrieveAppointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      return res.json({ tool: toolName, result: data });
    } else if (toolName === 'modifyAppointment') {
      const resp = await fetch(`${muleBaseUrl}/mcp/modifyAppointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      return res.json({ tool: toolName, result: data });
    } else {
      return res.status(400).json({ error: 'Unsupported tool' });
    }
  } catch (err) {
    console.error('[MCP] Error invoking Mule:', err);
    return res.status(500).json({ error: 'Mule call failed', details: String(err) });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`MCP Server started on port ${PORT}`);
  console.log('Tools:', Object.keys(tools));
  console.log(`Tool descriptors available at http://localhost:${PORT}/tools`);
});
