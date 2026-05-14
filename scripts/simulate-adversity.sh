#!/bin/bash
# ZTAN ADVERSARIAL STRESS ENGINE
# Saturates system resources to test recovery determinism.

DURATION=${1:-60}
CORES=$(nproc)

echo "🔥 STARTING ADVERSARIAL STRESS ($DURATION seconds)"
echo "   CPU: $CORES cores"
echo "   IO: 1GB write/read loop"

# CPU STRESS
for i in $(seq 1 $CORES); do
    while true; do :; done &
    CPU_PIDS="$CPU_PIDS $!"
done

# IO STRESS
while true; do
    dd if=/dev/zero of=./stress_io.tmp bs=1M count=1024 status=none
    rm ./stress_io.tmp
done &
IO_PID=$!

sleep $DURATION

echo "🛑 STOPPING STRESS"
kill $CPU_PIDS $IO_PID
wait $CPU_PIDS $IO_PID 2>/dev/null
echo "✅ System restored to baseline."
