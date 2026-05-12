# ── KHÔNG tạo key pair mới ────────────────────────────
# Dùng lại key pair đã có sẵn trên AWS
data "aws_key_pair" "deployer" {
  key_name = "do-an-cloud-key-v3-tf"
}

# ── Security Group ────────────────────────────────────
resource "aws_security_group" "app_sg" {
  name        = "${var.app_name}-sg"
  description = "Allow SSH, HTTP, HTTPS from anywhere"

  # SSH
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_ip]
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  # All outbound
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = { Name = "${var.app_name}-sg" }
}

# ── EC2 Instance ──────────────────────────────────────
resource "aws_instance" "app_server" {
  ami                    = "ami-0a59248a6294cece2"   # Ubuntu 26.04 LTS, 64-bit x86, Sydney
  instance_type          = var.instance_type
  key_name               = "do-an-cloud-key-v3-tf"
  vpc_security_group_ids = [aws_security_group.app_sg.id]
  user_data              = file("${path.module}/user_data.sh")

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name        = "${var.app_name}-server"
    Environment = "production"
    ManagedBy   = "terraform"
    AMI         = "Ubuntu-26.04-LTS"
  }
}

# ── Elastic IP ────────────────────────────────────────
resource "aws_eip" "app_eip" {
  instance = aws_instance.app_server.id
  domain   = "vpc"
  tags     = { Name = "${var.app_name}-eip" }
}