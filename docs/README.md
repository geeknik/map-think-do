# Code-Reasoning MCP Server Documentation

This directory contains documentation for the Code-Reasoning MCP Server, a tool that enhances Claude's ability to solve complex programming tasks through structured, step-by-step thinking.

## Documentation Index

- [**Configuration Guide**](./configuration.md): Detailed information about all configuration options for the Code-Reasoning MCP Server, including command-line options, integration with Claude Desktop and VS Code, and component configuration.

- [**Usage Examples**](./examples.md): Practical examples showing how to use the Code-Reasoning MCP Server for various programming tasks, including basic usage, advanced features like thought branching and revision, and integration examples.

- [**Prompts Guide**](./prompts.md): Information about the prompt system in the Code-Reasoning MCP Server, including available prompts, how to use them with Claude Desktop, and how to customize prompts for your own needs.

- [**Testing Information**](./testing.md): Basic information about testing the Code-Reasoning MCP Server, primarily relevant for developers who are extending or modifying the server.

## Getting Started

To get started with the Code-Reasoning MCP Server, follow these steps:

1. **Install the server**:

   ```bash
   # Option 1: Use with npx (recommended for most users)
   npx @mettamatt/code-reasoning

   # Option 2: Install globally
   npm install -g @mettamatt/code-reasoning
   ```

2. **Configure Claude Desktop**:
   Edit your Claude Desktop configuration file to include the Code-Reasoning MCP Server:

   ```json
   {
     "mcpServers": {
       "code-reasoning": {
         "command": "npx",
         "args": ["-y", "@mettamatt/code-reasoning"]
       }
     }
   }
   ```

3. **Use with Claude**:
   Ask Claude to use sequential thinking in your prompts:

   ```
   Please analyze this code using sequential thinking to break down the solution step by step.
   ```

4. **Access ready-to-use prompts**:
   - Click the "+" icon in the Claude Desktop chat window
   - Select "Code Reasoning Tool" from the available tools
   - Choose a prompt template and fill in the required information

For more detailed information, see the specific documentation files linked above.

## Security and Logging

⚠️ **IMPORTANT: Data Exposure Warning for Operators**

The Sentient AGI Reasoning Server includes comprehensive logging capabilities that may capture sensitive information from user inputs and cognitive processing. Please be aware of the following security considerations:

### Logging Behavior

**Debug Mode (debug: true)**:
- Raw content from user inputs, thoughts, and cognitive processes is logged in plain text
- All cognitive operations, memory updates, and reasoning steps are fully logged
- Sensitive information (API keys, passwords, personal data) may appear in logs
- Log files are stored in the `logs/` directory with timestamps

**Production Mode (debug: false - Default)**:
- Sensitive content is automatically redacted using pattern matching
- Content is hashed (SHA-256, truncated) for tracking without exposing data
- Log entries are marked with `[REDACTED]` indicators
- Only sanitized summaries and metadata are logged

### Sensitive Content Detection

The logging system automatically detects and redacts:
- API keys and authentication tokens (20+ character strings)
- Email addresses and phone numbers
- Social Security Numbers and credit card patterns
- File paths containing usernames (`/home/user`, `/Users/user`)
- Password/secret patterns (`password: value`, `token=abc123`)
- IP addresses and other potentially identifying information

### Recommendations for Operators

1. **Never run in debug mode in production environments**
2. **Regularly rotate and secure log files** in the `logs/` directory
3. **Review log retention policies** - consider automated cleanup
4. **Monitor for sensitive data leakage** in non-debug logs
5. **Use secure file permissions** on log directories
6. **Consider centralized logging solutions** with proper encryption

### Enabling/Disabling Debug Mode

Debug mode can be controlled via:
- Configuration: `debug: false` (recommended for production)
- Environment: Set appropriate logging levels for your deployment
- Runtime: Debug mode affects all logging throughout the cognitive system

### Log File Locations

- Application logs: `logs/custom-test-TIMESTAMP.log`
- Test results: `test-results/custom-result-TIMESTAMP.json`
- Memory persistence: Various locations based on configuration

**Remember**: Even with redaction enabled, cognitive metadata and system behavior patterns are still logged. Ensure compliance with your organization's data handling policies.
