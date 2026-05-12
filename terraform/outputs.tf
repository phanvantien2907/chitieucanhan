output "ec2_public_ip" {
  description = "IP tĩnh → copy vào GitHub Secret: EC2_HOST"
  value       = aws_eip.app_eip.public_ip
}

output "ec2_instance_id" {
  value = aws_instance.app_server.id
}

output "ssh_command" {
  description = "Lệnh SSH vào server"
  value       = "ssh -i do-an-cloud-key-v3-tf.pem ubuntu@${aws_eip.app_eip.public_ip}"
}