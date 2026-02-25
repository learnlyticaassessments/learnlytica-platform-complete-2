# Terraform: AWS Ubuntu EC2 for Learnlytica

This provisions a single Ubuntu EC2 instance, security group, and optional Elastic IP.

It does not deploy the app code itself. After Terraform finishes, SSH to the instance and run:

```bash
sudo bash deploy-aws-ubuntu.sh
```

## Usage

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars
terraform init
terraform plan
terraform apply
```

SSH access options:
- Restrict SSH to your IP: `allow_ssh_from_anywhere = false` and set `allowed_ssh_cidr = "x.x.x.x/32"`
- Open SSH from anywhere (temporary): `allow_ssh_from_anywhere = true`

## Outputs

- `instance_id`
- `public_ip`
- `public_dns`
- `ssh_command`

## Resize (scale up/down)

Use the AWS CLI scripts from repo root:

```bash
./scripts/aws-scale-up.sh i-xxxxxxxxxxxxxxxxx us-east-1
./scripts/aws-scale-down.sh i-xxxxxxxxxxxxxxxxx us-east-1
```

These scripts stop the instance, change the instance type, and start it again.
