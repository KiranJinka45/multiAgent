class LogTrimmer:
    """
    Token Guard. Protects the LLM from taking in 50MB Maven/NPM dumps.
    Strips noise, extracts the stack trace, and enforces strict token ceilings.
    """

    MAX_LOG_LINES_ALLOWED = 100

    def trim(self, raw_log: str) -> str:
        """
        Parses thousands of lines down to the actionable trace.
        """
        lines = raw_log.splitlines()
        
        if len(lines) <= self.MAX_LOG_LINES_ALLOWED:
             return raw_log
             
        actionable_lines = []
        capture_mode = False
        
        # Look for explicit failure signals
        for line in lines:
            if "Exception:" in line or "Error:" in line or "Caused by:" in line or "ERR!" in line:
                capture_mode = True
                
            if capture_mode:
                actionable_lines.append(line)
                
            # Stop capturing after 50 lines of trace
            if len(actionable_lines) > 50 and not ("at " in line.strip()):
                capture_mode = False

        # Fallback if no explicit error was found but log is massive 
        # (e.g., standard out stalled)
        if not actionable_lines:
             actionable_lines = lines[-self.MAX_LOG_LINES_ALLOWED:]
             
        # Strictly enforce maximum allowed lines sent back to debug agent
        final_lines = actionable_lines[-self.MAX_LOG_LINES_ALLOWED:]
        
        return "...\n[TRIMMED NOISE]\n...\n" + "\n".join(final_lines)
