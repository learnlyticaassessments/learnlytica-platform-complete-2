#!/bin/bash
set -euo pipefail

if [ $# -lt 3 ]; then
  echo "Usage: $0 <instance-id> <region> <new-instance-type>"
  exit 1
fi

INSTANCE_ID="$1"
REGION="$2"
NEW_TYPE="$3"

echo "Checking instance state..."
STATE=$(aws ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text)

echo "Current state: $STATE"
echo "Stopping instance $INSTANCE_ID..."
aws ec2 stop-instances --region "$REGION" --instance-ids "$INSTANCE_ID" >/dev/null
aws ec2 wait instance-stopped --region "$REGION" --instance-ids "$INSTANCE_ID"

echo "Changing instance type to $NEW_TYPE..."
aws ec2 modify-instance-attribute \
  --region "$REGION" \
  --instance-id "$INSTANCE_ID" \
  --instance-type "{\"Value\":\"$NEW_TYPE\"}"

echo "Starting instance..."
aws ec2 start-instances --region "$REGION" --instance-ids "$INSTANCE_ID" >/dev/null
aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"

echo "Done. New instance type:"
aws ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].InstanceType' \
  --output text

