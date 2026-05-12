variable "aws_region" {
  default = "ap-southeast-2"   # Sydney
}

variable "instance_type" {
  default = "t3.micro"         # free tier eligible
}

variable "app_name" {
  default = "my-app"
}

variable "key_name" {
  default = "do-an-cloud-key-v3-tf"   # tên key pair trên AWS (không có .pem)
}

variable "allowed_ssh_ip" {
  description = "IP được phép SSH (đổi thành IP của bạn cho bảo mật hơn)"
  type        = string
  default     = "0.0.0.0/0"
}