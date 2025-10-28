# AWS Infrastructure Audit Summary

**Region:** ap-south-1  
**Timestamp:** 2025-10-25 09:41:42  
**Account ID:** 949945086246

## Quick Overview

### EC2 Instances
-------------------------------------------------------------
|                     DescribeInstances                     |
+----------------------+----------+-------------------------+
|  i-0637c58cdea794428 |  running |  Upscpro-be-prod        |
|  i-0038090d9869bd6f4 |  running |  Upscpro-be-stage       |
|  i-0b3899c58070bd490 |  running |  Upscpro-cms-stage-env  |
|  i-02ceecfa031cc4284 |  running |  Upscpro-cms-prod-env   |
+----------------------+----------+-------------------------+

### RDS Instances
---------------------------------------------------------------------------------------------------------
|                                          DescribeDBInstances                                          |
+----------------------+------------+-------------------------------------------------------------------+
|  upscpro-cms-prod-db |  available |  upscpro-cms-prod-db.c8wrvaeukcp0.ap-south-1.rds.amazonaws.com    |
|  upscpro-cms-stage-db|  available |  upscpro-cms-stage-db.c8wrvaeukcp0.ap-south-1.rds.amazonaws.com   |
+----------------------+------------+-------------------------------------------------------------------+

### Load Balancers
------------------------------------------------------------------------------------------------------------
|                                           DescribeLoadBalancers                                          |
+---------------------------+---------+--------------------------------------------------------------------+
|  awseb-AWSEB-COTQ1OJFOPON |  active |  awseb-AWSEB-COTQ1OJFOPON-1623987383.ap-south-1.elb.amazonaws.com  |
|  awseb-AWSEB-QGSQI79L9L21 |  active |  awseb-AWSEB-QGSQI79L9L21-628761628.ap-south-1.elb.amazonaws.com   |
+---------------------------+---------+--------------------------------------------------------------------+

### CloudFront Distributions
------------------------------------------------------------------------------------------------------------------
|                                                ListDistributions                                               |
+----------------+---------------------------------+-----------+-------------------------------------------------+
|  E1H2Z2TJS430T5|  d3rabitf5fb21b.cloudfront.net  |  Deployed |  cdn for  upscpro dev user app                  |
|  E2JRNKBC7BAQ89|  d2kmcdm2k7jjn5.cloudfront.net  |  Deployed |  cdn for upscpro dev admin app                  |
|  E28JN1K98NS6TG|  d409e6nsbinzs.cloudfront.net   |  Deployed |  cdn for upscpro stage admin app                |
|  E28PCT507E4ORS|  d2vufs7bhixfch.cloudfront.net  |  Deployed |  cdn for upscpro production admin app           |
|  E270MD6IWYRLPX|  d3nr0wuga5xmkt.cloudfront.net  |  Deployed |  cdn for upscpro stage account app              |
|  E1T2FI0HRNE0LY|  d32cdu5y2cpgyt.cloudfront.net  |  Deployed |  cdn for upscpro production account app         |
|  E3M41TOU5DXNP |  d36zslhbx5tocu.cloudfront.net  |  Deployed |  cdn for upscpro dev admin app                  |
|  E1NY31XRS3L8B7|  d1tk24vj9z3scf.cloudfront.net  |  Deployed |  cdn for upscpro dev account app                |
|  EYPVWVXYTHXYE |  d2mqhrxyhjxajb.cloudfront.net  |  Deployed |  cdn for upscpro stage walkin reg app           |
|  E3VX9JJWAAFVOT|  d13i1oz0wjbhh3.cloudfront.net  |  Deployed |  cdn for upscpro dev front desk management app  |
|  EMHDAUQ20YOET |  d2alhjkuju9bdk.cloudfront.net  |  Deployed |  cdn for upscpro production new account  app    |
|  E1ZHLOABBU9EVC|  d3pnnv92otlb34.cloudfront.net  |  Deployed |  cdn for upscpro production new admin app       |
|  E15Q7F88S7IYL9|  d3a5xzbk2la2cn.cloudfront.net  |  Deployed |  cdn for upscpro production front desk app      |
|  E3UDOWAH0GI1PS|  d3qmgu1wp80y83.cloudfront.net  |  Deployed |  cdn for upscpro production walkin app          |
|  E1BZRMZKHI5KRE|  d7rkxymxw2c71.cloudfront.net   |  Deployed |  cdn for upscpro stage content app              |
|  E2ABQGPGA2E7LN|  d8r625nvcdb4i.cloudfront.net   |  Deployed |  cdn for content management app                 |
|  E3MUYHFFG8631C|  d3dvkxuc0birir.cloudfront.net  |  Deployed |  cdn for stage faculty app                      |
|  EB53J5QJ3J881 |  ds4j5me58jz4u.cloudfront.net   |  Deployed |  cdn for faculty app                            |
|  E11S17URNNH4IF|  dzcp9iqaunqa.cloudfront.net    |  Deployed |  cdn for stage student app                      |
|  E6IG1YUF7T32T |  dzxs81w4nypc2.cloudfront.net   |  Deployed |  cdn for student app                            |
|  E18BQV4MX4BHX0|  d2ih0icokgyk1q.cloudfront.net  |  Deployed |  cdn for stage dashboard app                    |
|  E1E2R0E9BCV4QJ|  dtqdicrqbbs3s.cloudfront.net   |  Deployed |  cdn for dashboard app                          |
|  E3HQRMYZ17SIO0|  d1yjndl6cd0cvu.cloudfront.net  |  Deployed |  cdn for stage quick walkin                     |
|  E29FQTFXO8OJZK|  dxzodjt6iun63.cloudfront.net   |  Deployed |  cdn for quick walkin                           |
|  E2XP27VMW3QFHY|  dn0aa2yk39muf.cloudfront.net   |  Deployed |  cdn for stage evaluation app                   |
|  E1XIREO11GKNVK|  d258uutqux5sat.cloudfront.net  |  Deployed |  cdn for prod evaluation app                    |
+----------------+---------------------------------+-----------+-------------------------------------------------+

### S3 Buckets
--------------------------------------------------------------------------
|                               ListBuckets                              |
+-------------------------------------------+----------------------------+
|  account.upscpro.laex.in                  |  2024-11-12T04:27:16.000Z  |
|  account2.upscpro.laex.in                 |  2024-12-13T06:38:45.000Z  |
|  admin.upscpro.laex.in                    |  2024-11-07T21:21:07.000Z  |
|  admin2.upscpro.laex.in                   |  2024-12-13T06:42:06.000Z  |
|  content.upscpro.laex.in                  |  2025-02-01T04:52:52.000Z  |
|  dashboard.upscpro.laex.in                |  2025-03-04T04:45:06.000Z  |
|  dev-account.upscpro.laex.in              |  2024-11-09T14:06:42.000Z  |
|  dev-admin-app.upsc.pro                   |  2024-11-12T20:26:30.000Z  |
|  dev-admin.upscpro.laex.in                |  2024-11-09T14:06:48.000Z  |
|  dev-app.upsc.pro                         |  2024-11-09T14:07:24.000Z  |
|  dev-frontdesk.upscpro.laex.in            |  2024-11-20T20:49:25.000Z  |
|  dev-walkin.upscpro.laex.in               |  2024-11-20T14:29:05.000Z  |
|  elasticbeanstalk-ap-south-1-949945086246 |  2024-11-13T02:33:25.000Z  |
|  elasticbeanstalk-us-west-2-949945086246  |  2024-11-09T19:27:58.000Z  |
|  evaluation.upscpro.laex.in               |  2025-04-04T04:40:10.000Z  |
|  frontdesk.upscpro.laex.in                |  2024-12-13T06:44:21.000Z  |
|  logs-stage-admin.upscpro.laex.in         |  2024-11-10T00:17:21.000Z  |
|  stage-account.upscpro.laex.in            |  2024-11-13T21:16:45.000Z  |
|  stage-admin.upscpro.laex.in              |  2024-11-10T09:56:10.000Z  |
|  stage-content.upscpro.laex.in            |  2025-02-06T13:15:18.000Z  |
|  stage-dashboard.upscpro.laex.in          |  2025-03-04T04:43:52.000Z  |
|  stage-evaluation.upscpro.laex.in         |  2025-04-04T04:38:08.000Z  |
|  stage-quick-walkin.upscpro.laex.in       |  2025-03-25T11:31:59.000Z  |
|  stage-student.upscpro.laex.in            |  2025-03-04T04:41:50.000Z  |
|  stage-teaching.upscpro.laex.in           |  2025-02-18T05:01:01.000Z  |
|  student.upscpro.laex.in                  |  2025-03-04T04:42:33.000Z  |
|  teaching.upscpro.laex.in                 |  2025-02-18T05:02:49.000Z  |
|  upscpro-be-dev-assets                    |  2024-11-10T12:14:00.000Z  |
|  upscpro-be-dev-img                       |  2024-11-10T12:14:01.000Z  |
|  upscpro-be-prod-assets                   |  2024-11-10T12:14:01.000Z  |
|  upscpro-be-stage-assets                  |  2024-11-10T12:14:01.000Z  |
|  upscpro-cms-dev-assets                   |  2024-11-14T00:09:24.000Z  |
|  upscpro-cms-dev-img                      |  2024-11-14T00:09:23.000Z  |
|  upscpro-cms-prod-assets                  |  2024-11-10T12:14:01.000Z  |
|  upscpro-cms-stage-assets                 |  2024-11-08T05:09:25.000Z  |
|  upscpro-cms-stage-img                    |  2024-11-14T00:09:23.000Z  |
|  upscpro.laex-cms-prod-assets             |  2024-11-10T12:14:01.000Z  |
|  upscpro.laex-cms-prod-img                |  2024-11-10T12:14:01.000Z  |
|  walkin-quick.upscpro.laex.in             |  2025-03-25T11:34:32.000Z  |
|  walkin.upscpro.laex.in                   |  2024-12-13T06:45:22.000Z  |
+-------------------------------------------+----------------------------+

## File Structure

This audit contains the following files:
- `00-AUDIT-SUMMARY.md` - This summary file
- `01-account-info.json` - AWS account information
- `02-available-regions.json` - Available AWS regions
- `03-ec2-instances.json` - EC2 instances details
- `04-ec2-instance-types.json` - Available EC2 instance types
- `05-ec2-key-pairs.json` - EC2 key pairs
- `06-ec2-security-groups.json` - Security groups
- `07-vpcs.json` - VPCs
- `08-subnets.json` - Subnets
- `09-route-tables.json` - Route tables
- `10-internet-gateways.json` - Internet gateways
- `11-nat-gateways.json` - NAT gateways
- `12-elastic-ips.json` - Elastic IPs
- `13-alb-load-balancers.json` - Application Load Balancers
- `14-clb-load-balancers.json` - Classic Load Balancers
- `15-target-groups.json` - Target groups
- `16-listeners.json` - Load balancer listeners
- `17-cloudfront-distributions.json` - CloudFront distributions
- `18-rds-instances.json` - RDS instances
- `19-rds-subnet-groups.json` - RDS subnet groups
- `20-rds-parameter-groups.json` - RDS parameter groups
- `21-rds-snapshots.json` - RDS snapshots
- `22-s3-buckets.json` - S3 buckets list
- `23-s3-bucket-*-location.json` - S3 bucket locations
- `24-s3-bucket-*-policy.json` - S3 bucket policies
- `25-s3-bucket-*-versioning.json` - S3 bucket versioning
- `26-s3-bucket-*-public-access.json` - S3 public access blocks
- `27-s3-bucket-*-encryption.json` - S3 bucket encryption
- `28-s3-bucket-*-lifecycle.json` - S3 bucket lifecycle
- `29-ecs-clusters.json` - ECS clusters
- `30-ecs-services.json` - ECS services
- `31-ecs-task-definitions.json` - ECS task definitions
- `32-ecr-repositories.json` - ECR repositories
- `33-route53-hosted-zones.json` - Route53 hosted zones
- `34-route53-health-checks.json` - Route53 health checks
- `35-acm-certificates.json` - ACM certificates
- `36-cloudwatch-log-groups.json` - CloudWatch log groups
- `37-cloudwatch-alarms.json` - CloudWatch alarms
- `38-iam-users.json` - IAM users
- `39-iam-roles.json` - IAM roles
- `40-iam-policies.json` - IAM policies
- `41-eb-applications.json` - Elastic Beanstalk applications
- `42-eb-environments.json` - Elastic Beanstalk environments
- `43-lambda-functions.json` - Lambda functions
- `44-api-gateway-rest-apis.json` - API Gateway REST APIs
- `45-api-gateway-v2-apis.json` - API Gateway V2 APIs
- `46-elasticache-clusters.json` - ElastiCache clusters
- `47-elasticache-replication-groups.json` - ElastiCache replication groups

## Usage

To view specific information:
```bash
# View EC2 instances
cat 03-ec2-instances.json | jq '.'

# View RDS instances
cat 18-rds-instances.json | jq '.'

# View CloudFront distributions
cat 17-cloudfront-distributions.json | jq '.'
```

## Next Steps

1. Review the summary above
2. Examine specific JSON files for detailed information
3. Use this data to plan infrastructure changes
4. Compare with Terraform state if needed

