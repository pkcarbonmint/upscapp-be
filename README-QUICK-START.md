# Quick Start Guide - Cloud Provider Selection

This project supports deployment to both **DigitalOcean** (60% cheaper) and **AWS** (more features). Choose based on your needs and budget.

## 🚀 Super Quick Start

```bash
# 1. Interactive setup (recommended)
./scripts/deploy-multi.sh

# 2. Build and deploy
./scripts/build-multi.sh

# 3. Check status
./scripts/manage-multi.sh status
```

## 💰 Cost Comparison

| Provider | Monthly Cost | Best For |
|----------|-------------|----------|
| **DigitalOcean** | $48-78 | Small-medium apps, cost-conscious |
| **AWS** | $120-200 | Enterprise, high-scale, advanced features |

## 📚 Full Documentation

- **[Multi-Cloud Setup Guide](README-MULTI-CLOUD.md)** - Complete instructions for both providers
- **[AWS-Only Setup](README-DEPLOYMENT.md)** - AWS-specific documentation (legacy)

## 🔧 Provider-Specific Quick Commands

### DigitalOcean (Recommended - Cheaper)
```bash
./scripts/deploy-multi.sh digitalocean
./scripts/build-multi.sh digitalocean
./scripts/manage-multi.sh digitalocean status
```

### AWS (Enterprise Features)
```bash  
./scripts/deploy-multi.sh aws
./scripts/build-multi.sh aws
./scripts/manage-multi.sh aws status
```

## 📁 Key Files to Configure

### DigitalOcean
- Copy `terraform-digitalocean/terraform.tfvars.example` → `terraform-digitalocean/terraform.tfvars`
- Add your DigitalOcean token

### AWS
- Copy `terraform/terraform.tfvars.example` → `terraform/terraform.tfvars`  
- Add database passwords and AWS region

## 🆘 Need Help?

1. Check [Multi-Cloud Setup Guide](README-MULTI-CLOUD.md) for detailed instructions
2. Use `./scripts/manage-multi.sh help` for command options
3. Check logs: `./scripts/manage-multi.sh logs`

**Recommendation**: Start with DigitalOcean for 60% cost savings, migrate to AWS later if needed.