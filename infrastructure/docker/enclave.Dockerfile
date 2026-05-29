FROM node:20-alpine

# Set to run as non-root on the host, but root in the namespace mapping.
# Actually inside the container we run as root, and remapping happens in docker run.

WORKDIR /app

# The app directory will be provided as a read-only bind mount or built-in
# For wave 1 testing, we just copy basic files
COPY package.json ./
RUN npm install --production

COPY . .

# Ensure tmp is usable via a ramdisk (tmpfs) mounted at runtime
# Run the enclave runner
ENTRYPOINT ["node", "dist/packages/runtime-core/src/supervisor/enclave-runner.js"]
