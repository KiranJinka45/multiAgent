import re
import hashlib
from typing import Dict, Any, Optional

class ErrorClassifier:
    """
    Rule-based error classification engine.
    Categorizes errors using pattern matching.
    """
    
    ERROR_PATTERNS = {
        # --- Backend (Spring Boot Specific) [20] ---
        "bean_injection_failure": [re.compile(r"No qualifying bean of type '(.*?)' available")],
        "circular_dependency": [re.compile(r"Relying upon circular references is discouraged and they are prohibited by default")],
        "missing_datasource": [re.compile(r"Failed to configure a DataSource: 'url' attribute is not specified")],
        "flyway_migration_failed": [re.compile(r"Flyway migration failed")],
        "r2dbc_connection_refused": [re.compile(r"R2DBC Connection to (.*?) refused")],
        "class_not_found": [re.compile(r"java.lang.ClassNotFoundException: (.*?)")],
        "method_not_found": [re.compile(r"java.lang.NoSuchMethodError: (.*?)")],
        "invalid_mapping": [re.compile(r"Ambiguous mapping\\. Cannot resolve method")],
        "jwt_missing_secret": [re.compile(r"JWT secret key is missing")],
        "spring_security_unauthorized": [re.compile(r"Full authentication is required to access this resource")],
        "data_integrity_violation": [re.compile(r"org.springframework.dao.DataIntegrityViolationException")],
        "timeout_exception": [re.compile(r"java.util.concurrent.TimeoutException")],
        "null_pointer_exception": [re.compile(r"java.lang.NullPointerException")],
        "illegal_argument": [re.compile(r"java.lang.IllegalArgumentException: (.*?)")],
        "jackson_parse_error": [re.compile(r"com.fasterxml.jackson.core.JsonParseException")],
        "hibernate_mapping_error": [re.compile(r"org.hibernate.MappingException")],
        "missing_annotation": [re.compile(r"Annotation (.*?) is missing")],
        "invalid_bean_definition": [re.compile(r"org.springframework.beans.factory.BeanDefinitionStoreException")],
        "port_in_use_spring": [re.compile(r"Web server failed to start\. Port (.*?) was already in use")],
        "maven_dependency_resolution": [re.compile(r"Could not resolve dependencies for project")],
        
        # --- Frontend (Angular Specific) [10] ---
        "missing_module": [re.compile(r"Cannot find module '(.*?)' or its corresponding type declarations")],
        "component_not_found": [re.compile(r"The Component '(.*?)' is not statically analyzable")],
        "invalid_template": [re.compile(r"Template parse errors: (.*?)")],
        "unknown_property": [re.compile(r"Can't bind to '(.*?)' since it isn't a known property of")],
        "npm_missing_package": [re.compile(r"npm ERR! code E404\n.*?'(.*?)' is not in the npm registry")],
        "typescript_type_mismatch": [re.compile(r"Type '(.*?)' is not assignable to type '(.*?)'")],
        "angular_ivy_error": [re.compile(r"NGCC failed")],
        "routing_error": [re.compile(r"Cannot match any routes. URL Segment: '(.*?)'")],
        "missing_injection_token": [re.compile(r"NullInjectorError: No provider for (.*?)!")],
        "zonejs_error": [re.compile(r"Zone.js has detected that ZoneAwarePromise")],
        
        # --- Docker/Infra [5] ---
        "docker_build_failed": [re.compile(r"failed to solve: process (.*?) did not complete successfully")],
        "container_oom": [re.compile(r"exited with code 137")],
        "volume_mount_failed": [re.compile(r"failed to recreate volume")],
        "network_not_found": [re.compile(r"network (.*?) not found")],
        "docker_daemon_unreachable": [re.compile(r"Cannot connect to the Docker daemon")],
        
        # --- Environment/Config [5] ---
        "missing_env_var": [re.compile(r"Environment variable (.*?) is missing")],
        "invalid_env_format": [re.compile(r"Invalid format for environment variable (.*?)")],
        "cors_blocked": [re.compile(r"has been blocked by CORS policy")],
        "ssl_cert_expired": [re.compile(r"SSL certificate problem: certificate has expired")],
        "rate_limit_exceeded": [re.compile(r"429 Too Many Requests")]
    }

    def _generate_fingerprint(self, category: str, details: str) -> str:
        """Generates a stable hash for an error based on category and details."""
        content = f"{category}:{details}".encode('utf-8')
        return hashlib.sha256(content).hexdigest()

    def _get_local_strategy(self, category: str, details: str) -> Optional[str]:
        """Provides local fix strategies for specific error categories."""
        if category == "missing_dependency" or category == "npm_missing_package":
            return f"Run `npm install {details} --save` or add to pom.xml"
        if category == "port_in_use_spring":
            return f"Change server.port in application.yml to a different port (e.g., 8081)"
        if category == "missing_env_var":
            return f"Add {details} to .env and application.yml"
        if category == "missing_injection_token":
             return f"Ensure {details} is added to the strictly provided array or app.config.ts"
        return None

    def _calculate_confidence(self, category: str) -> float:
         """Returns a confidence score for the matched pattern."""
         high_confidence = ["port_in_use_spring", "missing_dependency", "missing_env_var", "npm_missing_package"]
         medium_confidence = ["bean_injection_failure", "missing_injection_token", "typescript_type_mismatch"]
         
         if category in high_confidence:
             return 0.95
         if category in medium_confidence:
             return 0.75
         return 0.50


    def classify(self, build_log: str) -> Dict[str, Any]:
        """
        Normalizes build logs and categorizes errors.
        """
        for category, patterns in self.ERROR_PATTERNS.items():
            for pattern in patterns:
                match = pattern.search(build_log)
                if match:
                    details = match.group(1) if len(match.groups()) > 0 else "N/A"
                    fingerprint = self._generate_fingerprint(category, details)
                    confidence = self._calculate_confidence(category)
                    strategy = self._get_local_strategy(category, details)
                    
                    # Target behavior threshold based on the requirements
                    requires_llm = confidence < 0.80 or strategy is None

                    return {
                        "error_hash": fingerprint,
                        "category": category,
                        "details": details,
                        "confidence": confidence,
                        "recommended_fix_strategy": strategy,
                        "requires_llm_debug": requires_llm
                    }
        
        # Fallback to LLM Debug Agent
        return {
            "error_hash": self._generate_fingerprint("unknown", "Uncategorized error log"),
            "category": "unknown",
            "details": "Uncategorized error log",
            "confidence": 0.0,
            "recommended_fix_strategy": None,
            "requires_llm_debug": True
        }
