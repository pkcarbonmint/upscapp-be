# Deployment Checklist - Docker Build Fix

Use this checklist to deploy the Docker build fixes safely.

## Pre-Deployment (5 minutes)

### 1. Review Changes
- [ ] Read `FIX_SUMMARY.md` (2 min read)
- [ ] Review `BEFORE_AFTER_COMPARISON.md` (visual comparison)
- [ ] Understand what's changing:
  - [ ] New file: `docker-user-data-improved.sh`
  - [ ] Modified: `main.tf` (line 488 only)
  - [ ] No data changes
  - [ ] No breaking changes

### 2. Backup Current State
```bash
cd /workspace/terraform-stage2

# Backup current state
cp terraform.tfstate terraform.tfstate.backup-$(date +%Y%m%d-%H%M%S)
cp main.tf main.tf.backup

# Note current instance ID for rollback
terraform output docker_instance_id > /tmp/current-instance-id.txt
```
- [ ] State backed up
- [ ] Instance ID recorded

### 3. Validate Configuration
```bash
cd /workspace/terraform-stage2

# Check Terraform syntax
terraform fmt -check

# Validate configuration
terraform validate
```
- [ ] `terraform fmt` passes
- [ ] `terraform validate` passes

### 4. Check GitHub Token
```bash
# Verify token is set
echo $TF_VAR_github_token | head -c 10

# Verify token format (should show ghp_ or github_pat_)
echo $TF_VAR_github_token | cut -c1-4
```
- [ ] Token is set (not empty)
- [ ] Token format correct (starts with `ghp_` or `github_pat_`)

## Deployment (5 minutes)

### 5. Review Terraform Plan
```bash
cd /workspace/terraform-stage2
terraform plan -out=tfplan

# Review carefully:
# - Should show: aws_instance.docker will be replaced
# - Should NOT show: any RDS, VPC, or other resource changes
```
- [ ] Plan shows only Docker instance replacement
- [ ] No unexpected changes
- [ ] Plan saved to `tfplan`

### 6. Apply Changes
```bash
# Apply the plan
terraform apply tfplan

# Note the start time
date > /tmp/deployment-start-time.txt
```
- [ ] Apply started
- [ ] Start time recorded
- [ ] No errors during apply

Expected output:
```
aws_instance.docker[0]: Destroying... [id=i-xxxxx]
aws_instance.docker[0]: Destruction complete after 30s
aws_instance.docker[0]: Creating...
aws_instance.docker[0]: Still creating... [10s elapsed]
...
aws_instance.docker[0]: Creation complete after 2m30s

Apply complete! Resources: 1 added, 0 changed, 1 destroyed.
```

### 7. Note New Instance Details
```bash
# Get new instance details
terraform output docker_instance_id
terraform output docker_instance_public_ip

# Save to file
terraform output > /tmp/terraform-outputs-after-fix.txt
```
- [ ] New instance ID recorded
- [ ] New public IP recorded
- [ ] Outputs saved

## Post-Deployment Monitoring (20 minutes)

### 8. Initial Check (Wait 5 minutes first)
```bash
# Wait for instance to boot
echo "Waiting 5 minutes for instance to initialize..."
sleep 300

# Check instance status
./check-build-status.sh
```

**Expected at T+5 min:**
- [ ] ✅ Instance is reachable
- [ ] ✅ SSH connection successful
- [ ] ⏳ Docker installing...
- [ ] ⏳ Repository cloning...

### 9. Mid-Deployment Check (T+10 min)
```bash
# Check progress
./check-build-status.sh

# Or watch CloudWatch logs
aws logs tail /aws/ec2/upscpro-stage2-docker --follow --region ap-south-1
```

**Expected at T+10 min:**
- [ ] ✅ Docker installed
- [ ] ✅ Docker Compose installed
- [ ] ✅ Repository cloned
- [ ] ⏳ Docker build in progress...

### 10. Build Progress Check (T+15 min)
```bash
# Check build progress
./monitor-ec2-stage2.sh ssh
tail -f /var/log/user-data.log
# Press Ctrl+C to exit

# Or check CloudWatch
aws logs tail /aws/ec2/upscpro-stage2-docker --follow
```

**Expected at T+15 min:**
- [ ] ⏳ Building Docker images...
- [ ] See "Building" messages in logs
- [ ] No error messages

### 11. Completion Check (T+25-30 min)
```bash
# Full status check
./check-build-status.sh
```

**Expected at T+30 min:**
- [ ] ✅ Instance is reachable
- [ ] ✅ SSH connection successful
- [ ] ✅ Docker installed
- [ ] ✅ Docker Compose installed
- [ ] ✅ Repository cloned successfully
- [ ] ✅ Docker images found
- [ ] ✅ Docker Compose services: Up
- [ ] ✅ App API health check: 200
- [ ] ✅ Helios health check: 200
- [ ] 🎉 Deployment successful!

### 12. Verify Services
```bash
# Check all services are running
./monitor-ec2-stage2.sh status

# Check service URLs
./monitor-ec2-stage2.sh urls

# View logs to ensure no errors
./monitor-ec2-stage2.sh logs | head -50
```
- [ ] All services show "Up"
- [ ] No crash loops
- [ ] No error messages in logs

### 13. Test Service Access
```bash
# Get ALB URL
ALB_URL=$(terraform output -raw alb_url)

# Test frontend (may take a minute for ALB to update)
curl -I $ALB_URL

# Should return HTTP 200 or 301/302 redirect
```
- [ ] ALB responding
- [ ] Frontend accessible
- [ ] No 5xx errors

### 14. Verify Auto-Recovery
```bash
# SSH into instance
./monitor-ec2-stage2.sh ssh

# Check auto-recovery timer
systemctl status upscpro-monitor.timer
systemctl list-timers | grep upscpro

# Exit
exit
```
- [ ] Timer is active and enabled
- [ ] Next trigger scheduled (~10 minutes)

### 15. Verify CloudWatch Logs
```bash
# Check logs are flowing to CloudWatch
aws logs describe-log-streams \
  --log-group-name /aws/ec2/upscpro-stage2-docker \
  --region ap-south-1 \
  --max-items 5

# Tail recent logs
aws logs tail /aws/ec2/upscpro-stage2-docker \
  --region ap-south-1 \
  --since 30m
```
- [ ] Log streams exist
- [ ] Recent logs visible
- [ ] Can see deployment messages

## Post-Deployment Validation (5 minutes)

### 16. Functional Testing
- [ ] Visit frontend URL: `terraform output -raw frontend_url`
- [ ] Check onboarding UI: `$(terraform output -raw alb_url)/onboarding`
- [ ] Check faculty UI: `$(terraform output -raw alb_url)/faculty`
- [ ] All pages load without errors

### 17. Document Results
```bash
# Create deployment report
cat > /tmp/deployment-report.txt << EOF
Deployment Date: $(date)
Old Instance: $(cat /tmp/current-instance-id.txt)
New Instance: $(terraform output -raw docker_instance_id)
Deployment Time: $(cat /tmp/deployment-start-time.txt) to $(date)
Status: SUCCESS/FAILED
Issues: None / <list any issues>

Test Results:
- Instance reachable: YES/NO
- Services running: YES/NO
- Health checks: PASS/FAIL
- Auto-recovery: ENABLED/DISABLED
- CloudWatch logs: WORKING/NOT WORKING

EOF

cat /tmp/deployment-report.txt
```
- [ ] Report created
- [ ] All checks passed
- [ ] No issues to resolve

### 18. Cleanup (Optional)
```bash
# If everything works, clean up backups after a few days
# DO NOT DO THIS IMMEDIATELY - WAIT 3-7 DAYS

# rm terraform.tfstate.backup-*
# rm main.tf.backup
# rm /tmp/current-instance-id.txt
# rm /tmp/deployment-start-time.txt
```
- [ ] Scheduled cleanup reminder (Day 7)

## Rollback Procedure (If Needed)

### If Issues Occur:

#### Quick Rollback (5 minutes)
```bash
cd /workspace/terraform-stage2

# 1. Restore old main.tf
cp main.tf.backup main.tf

# 2. Apply rollback
terraform apply -auto-approve

# 3. Manual deployment
./deploy-remote.sh

# 4. Verify
./check-build-status.sh
```

#### Document Issues
- [ ] Screenshot error messages
- [ ] Save CloudWatch logs: `aws logs tail /aws/ec2/upscpro-stage2-docker --since 2h > /tmp/error-logs.txt`
- [ ] Save user-data log: `ssh ec2-user@<ip> cat /var/log/user-data.log > /tmp/user-data-error.log`
- [ ] Note what went wrong
- [ ] Note when it went wrong

## Success Criteria

Deployment is successful when ALL of these are true:

- [x] ✅ Terraform apply completed without errors
- [x] ✅ New EC2 instance created
- [x] ✅ Docker and dependencies installed automatically
- [x] ✅ Repository cloned automatically
- [x] ✅ Docker images built automatically (no manual intervention)
- [x] ✅ All services started automatically
- [x] ✅ Health checks passing (200 response)
- [x] ✅ Services accessible via ALB
- [x] ✅ Auto-recovery timer active
- [x] ✅ CloudWatch logs working
- [x] ✅ No manual SSH required
- [x] ✅ Total time: <35 minutes
- [x] ✅ No errors in logs

## Troubleshooting Guide

### Issue: Build taking too long (>30 min)

**Check:**
```bash
aws logs tail /aws/ec2/upscpro-stage2-docker --follow
```

**Common causes:**
- Slow network downloading packages
- Large Docker image layers
- Node/pnpm installing many dependencies

**Action:** Wait up to 45 minutes for first build

### Issue: Services not starting

**Check:**
```bash
./monitor-ec2-stage2.sh ssh
cd /opt/upscpro/upscapp-be
docker-compose logs
```

**Common causes:**
- Database connection issues
- Missing environment variables
- Port conflicts

**Action:** Check specific service logs

### Issue: Health checks failing

**Check:**
```bash
./monitor-ec2-stage2.sh ssh
curl http://localhost:8000/healthcheck
curl http://localhost:8080/health
```

**Common causes:**
- Services still starting
- Database not accessible
- Application errors

**Action:** Wait 2-3 minutes, check logs

### Issue: CloudWatch logs not appearing

**Check:**
```bash
./monitor-ec2-stage2.sh ssh
systemctl status amazon-cloudwatch-agent
```

**Action:** Agent may still be configuring, wait 5 minutes

## Contact & Support

If you encounter issues:

1. **Check documentation:**
   - `FIX_SUMMARY.md` - Quick overview
   - `DOCKER_BUILD_ISSUES_ANALYSIS.md` - Technical details
   - `IMPLEMENTATION_GUIDE.md` - Detailed guide

2. **Gather diagnostics:**
   - CloudWatch logs
   - Local logs: `/var/log/user-data.log`
   - Service logs: `docker-compose logs`
   - System status: `./check-build-status.sh`

3. **Try rollback procedure above**

4. **Report issue with:**
   - All log files
   - Exact error messages
   - Timeline of events
   - Deployment report

## Post-Deployment Tasks (Week 1)

### Daily Checks (Days 1-7)
```bash
# Quick daily check
cd /workspace/terraform-stage2
./check-build-status.sh

# Review any auto-recovery events
aws logs tail /aws/ec2/upscpro-stage2-docker \
  --filter-pattern "Auto-recovery" \
  --since 24h
```
- [ ] Day 1: All services stable
- [ ] Day 2: No auto-recovery triggers
- [ ] Day 3: CloudWatch logs working
- [ ] Day 4: No unexpected restarts
- [ ] Day 5: Performance acceptable
- [ ] Day 6: No issues reported
- [ ] Day 7: ✅ Deployment validated - success!

### After 1 Week
- [ ] Remove backup files (terraform.tfstate.backup-*, main.tf.backup)
- [ ] Update documentation with any learnings
- [ ] Set up CloudWatch dashboard (optional)
- [ ] Configure CloudWatch alarms (optional)
- [ ] Mark deployment as stable ✅

---

**Checklist Version:** 1.0  
**Last Updated:** 2025-10-25  
**Estimated Time:** 35-40 minutes total  
**Difficulty:** Easy  
**Risk Level:** Low (rollback available)
