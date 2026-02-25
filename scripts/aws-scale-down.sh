#!/bin/bash
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <instance-id> <region> [instance-type]"
  echo "Default scale-down type: t3.medium"
  exit 1
fi

INSTANCE_ID="$1"
REGION="$2"
NEW_TYPE="${3:-t3.medium}"

"$(dirname "$0")/aws-scale-instance.sh" "$INSTANCE_ID" "$REGION" "$NEW_TYPE"

