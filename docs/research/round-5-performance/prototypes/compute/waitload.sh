#!/bin/bash
# usage: waitload.sh <max_wait_s> <threshold> cmd...  waits until 1-min loadavg < threshold (or timeout), logs load, runs cmd
maxw=$1; thr=$2; shift 2; t=0
while :; do l=$(cut -d' ' -f1 /proc/loadavg); if awk "BEGIN{exit !($l < $thr)}"; then break; fi; if [ $t -ge $maxw ]; then echo "WAITLOAD: timeout, load still $l"; break; fi; sleep 15; t=$((t+15)); done
echo "WAITLOAD start $(date +%T) load=$(cat /proc/loadavg)"; "$@"; rc=$?; echo "WAITLOAD end $(date +%T) load=$(cat /proc/loadavg)"; exit $rc
