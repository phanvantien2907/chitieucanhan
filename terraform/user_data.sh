#!/bin/bash

# Update package
apt update -y

# Install Docker
apt install -y docker.io

# Enable & start Docker
systemctl enable docker
systemctl start docker

# Allow ubuntu user use docker without sudo
usermod -aG docker ubuntu

# Install Git
apt install -y git