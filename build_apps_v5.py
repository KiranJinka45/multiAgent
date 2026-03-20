import os
import subprocess

root = r"c:\multiagentic_project\multiAgent-main"
apps_dir = os.path.join(root, "apps")
packages_dir = os.path.join(root, "packages")

externals = [
    "bullmq", "ioredis", "pino", "uuid", "fs-extra", "archiver", "dotenv", 
    "zod", "react", "stripe", "prom-client", "redlock", "next", 
    "socket.io-client", "@supabase/supabase-js", "@temporalio/client", 
    "@temporalio/worker", "axios", "express", "socket.io", "cors", 
    "jsonwebtoken", "@kubernetes/client-node"
]

external_args = " ".join([f"--external:{ext}" for ext in externals])

def get_path(pkg_name, is_app=False):
    base = apps_dir if is_app else packages_dir
    pkg_path = os.path.join(base, pkg_name)
    dist_path = os.path.join(pkg_path, "dist", "index.js")
    if os.path.exists(dist_path): return dist_path
    src_index = os.path.join(pkg_path, "src", "index.ts")
    if os.path.exists(src_index): return src_index
    root_index = os.path.join(pkg_path, "index.ts")
    if os.path.exists(root_index): return root_index
    return None

aliases = {
    "@libs/utils": get_path("utils"),
    "@libs/agents": get_path("agents"),
    "@libs/contracts": get_path("contracts"),
    "@libs/ai": get_path("ai"),
    "@libs/db": get_path("db"),
    "@libs/supabase": get_path("supabase"),
    "@libs/observability": get_path("observability"),
    "@libs/sandbox-runtime": get_path("sandbox-runtime", True),
    "@libs/build-engine": get_path("build-engine"),
    "@libs/validator": get_path("validator"),
    "@libs/shared-services": get_path("shared-services"),
    "@libs/memory": get_path("memory"),
    "@libs/brain": get_path("brain"),
    "@libs/registry": get_path("registry"),
}

aliases = {k: v for k, v in aliases.items() if v}
alias_args = " ".join([f"--alias:{k}={v}" for k, v in aliases.items()])

apps = ["worker", "api", "orchestrator"]

for app in apps:
    app_path = os.path.join(apps_dir, app)
    entry = "src/index.ts" if app != "orchestrator" else "index.ts"
    print(f"Building {app}...")
    cmd = f"npx esbuild {entry} --bundle --platform=node --target=node20 --outfile=dist/index.js {external_args} {alias_args}"
    try:
        subprocess.run(cmd, shell=True, check=True, cwd=app_path)
        print(f"Successfully built {app}")
    except Exception as e:
        print(f"Failed to build {app}")
