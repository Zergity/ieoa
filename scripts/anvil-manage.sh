#!/bin/bash

stop_anvil() {
  # Stop anvil if running
  if [ -f .anvil.pid ]; then
    kill $(cat .anvil.pid) 2>/dev/null || true
    rm -f .anvil.pid
  fi
  pkill -9 anvil 2>/dev/null || true
}

start_anvil() {
  # Kill any existing anvil processes
  stop_anvil
  sleep 1
  # Start anvil in background (chain-id 1 enables EIP-7702 by default)
  nohup anvil --chain-id 1 > anvil.log 2>&1 &
  echo $! > .anvil.pid
  # Wait for anvil to be ready
  sleep 2
  echo "Anvil started (PID: $(cat .anvil.pid))"
}

case "$1" in
  start)
    start_anvil
    ;;
  stop)
    stop_anvil
    echo "Anvil stopped"
    ;;
  restart)
    stop_anvil
    start_anvil
    ;;
  *)
    echo "Usage: $0 {start|stop|restart}"
    exit 1
    ;;
esac
