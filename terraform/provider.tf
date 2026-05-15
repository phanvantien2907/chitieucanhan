terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # ── Remote State trên S3 ──────────────────────────────
  # Lưu state trên S3 thay vì local → GitHub Actions luôn
  # biết hạ tầng hiện tại, không bao giờ bị Duplicate nữa.
  #
  # ⚠️ Đổi "bucket" thành tên bucket S3 bạn đã tạo trên AWS.
  backend "s3" {
    bucket = "chitieucanhan-storage-729079515490-ap-southeast-2-an"
    key    = "chitieucanhan/production/terraform.tfstate"
    region = "ap-southeast-2"
  }
}

provider "aws" {
  region = var.aws_region
}