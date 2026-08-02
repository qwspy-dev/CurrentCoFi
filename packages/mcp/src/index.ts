#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createCurrentMcpServer } from "./server.js";

void serveStdio(() => createCurrentMcpServer().server);
console.error("Current CoFi MCP server running on stdio");
