output "instance_id" {
  value = aws_instance.learnlytica.id
}

output "public_ip" {
  value = var.allocate_eip ? aws_eip.learnlytica[0].public_ip : aws_instance.learnlytica.public_ip
}

output "public_dns" {
  value = aws_instance.learnlytica.public_dns
}

output "ssh_command" {
  value = "ssh -i /path/to/key.pem ubuntu@${var.allocate_eip ? aws_eip.learnlytica[0].public_ip : aws_instance.learnlytica.public_ip}"
}

