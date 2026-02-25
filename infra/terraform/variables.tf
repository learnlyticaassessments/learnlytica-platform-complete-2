variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "name_prefix" {
  type        = string
  description = "Prefix for resource names"
  default     = "learnlytica"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t3.medium"
}

variable "ssh_key_name" {
  type        = string
  description = "Existing AWS EC2 key pair name"
}

variable "allowed_ssh_cidr" {
  type        = string
  description = "CIDR allowed to SSH"
  default     = null
  nullable    = true
}

variable "allow_ssh_from_anywhere" {
  type        = bool
  description = "If true, allow SSH from 0.0.0.0/0. If false, uses allowed_ssh_cidr."
  default     = false
}

variable "root_volume_size_gb" {
  type        = number
  description = "Root EBS volume size (GB)"
  default     = 30
}

variable "allocate_eip" {
  type        = bool
  description = "Whether to allocate and attach an Elastic IP"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Extra tags"
  default     = {}
}
