# DynamoDB Migration Guide

This guide explains how to migrate the UPSC Study Planner from JSON-based data storage to DynamoDB.

## Overview

The migration involves:
1. **Terraform Infrastructure**: Provisioning DynamoDB tables
2. **Migration Script**: Moving JSON data to DynamoDB
3. **Updated Loaders**: New services that read from DynamoDB
4. **Configuration Service**: Allows switching between JSON and DynamoDB

## Files Created

### Terraform Infrastructure
- `terraform/main.tf` - Main Terraform configuration
- `terraform/dynamodb.tf` - DynamoDB table definitions
- `terraform/terraform.tfvars.example` - Example variables file

### Migration Scripts
- `scripts/migrate-to-dynamodb.ts` - Migration script to move JSON data to DynamoDB

### Updated Services
- `src/services/DynamoDBSubjectLoader.ts` - DynamoDB-based subject loader
- `src/engine/DynamoDBPrepModeEngine.ts` - DynamoDB-based prep mode engine
- `src/services/ConfigService.ts` - Configuration service for data source selection

## DynamoDB Tables Created

1. **upsc-subjects** - Main subjects with metadata
2. **upsc-topics** - Topics for each subject
3. **upsc-subtopics** - Detailed subtopics
4. **prep-modes** - Preparation mode configurations
5. **archetypes** - Student archetype configurations
6. **study-planner-config** - General configuration data

## Migration Steps

### 1. Install Dependencies

```bash
npm install
```

This will install the AWS SDK dependencies that were added to `package.json`.

### 2. Set up AWS Credentials

Make sure you have AWS credentials configured:

```bash
# Option 1: AWS CLI
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

### 3. Deploy Infrastructure with Terraform

```bash
# Initialize Terraform
npm run terraform:init

# Review the plan
npm run terraform:plan

# Apply the infrastructure
npm run terraform:apply
```

Or manually:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 4. Run the Migration Script

```bash
# Set environment variables (optional)
export AWS_REGION=us-east-1
export TABLE_PREFIX=""

# Run the migration
npm run migrate-to-dynamodb
```

### 5. Switch to DynamoDB Data Source

Set the environment variable to use DynamoDB:

```bash
export DATA_SOURCE=dynamodb
```

Or update your application configuration to use DynamoDB.

### 6. Test the Migration

You can test that the migration worked by running your existing tests or using the ConfigService:

```typescript
import { ConfigService } from './src/services/ConfigService';

// Check health status
const health = await ConfigService.getHealthStatus();
console.log('Data source health:', health);

// Load subjects using the configured data source
const subjects = await ConfigService.loadAllSubjects();
console.log(`Loaded ${subjects.length} subjects`);
```

## Environment Variables

- `DATA_SOURCE` - Set to `"dynamodb"` to use DynamoDB, `"json"` for JSON files (default: `"json"`)
- `AWS_REGION` - AWS region for DynamoDB (default: `"us-east-1"`)
- `TABLE_PREFIX` - Prefix for DynamoDB table names (default: `""`)

## Configuration Service Usage

The `ConfigService` provides a unified interface that works with both JSON and DynamoDB:

```typescript
import { ConfigService } from './src/services/ConfigService';

// These methods work with both data sources
const subjects = await ConfigService.loadAllSubjects();
const macroSubjects = await ConfigService.getSubjectsByCategory('Macro');
const subject = await ConfigService.getSubjectByCode('H01');

// Check which data source is being used
const dataSource = ConfigService.getDataSource(); // 'json' or 'dynamodb'
```

## Rollback Plan

If you need to rollback to JSON-based data:

1. Set `DATA_SOURCE=json` environment variable
2. Your application will automatically use the original JSON files
3. The DynamoDB tables can remain for future use

To completely remove DynamoDB resources:

```bash
npm run terraform:destroy
```

## Cost Considerations

The DynamoDB tables are configured with:
- **Billing Mode**: Pay-per-request (no fixed costs)
- **Global Secondary Indexes**: For efficient querying
- **No provisioned capacity**: Scales automatically

Estimated costs for typical usage should be minimal (< $5/month).

## Performance Benefits

DynamoDB provides several advantages over JSON files:

1. **Scalability**: Can handle much larger datasets
2. **Query Performance**: Indexed queries are faster than scanning JSON
3. **Concurrent Access**: Multiple instances can read simultaneously
4. **Caching**: Built-in caching with DynamoDB Accelerator (DAX) if needed
5. **Backup & Recovery**: Automatic backups and point-in-time recovery

## Troubleshooting

### Migration Script Fails

1. Check AWS credentials: `aws sts get-caller-identity`
2. Verify table names in AWS Console
3. Check CloudWatch logs for detailed error messages

### Application Can't Connect to DynamoDB

1. Verify `DATA_SOURCE` environment variable is set to `"dynamodb"`
2. Check AWS region configuration
3. Verify IAM permissions for DynamoDB access

### Performance Issues

1. Monitor DynamoDB metrics in CloudWatch
2. Consider adding DynamoDB Accelerator (DAX) for caching
3. Review query patterns and indexes

## Next Steps

After successful migration:

1. **Monitor Performance**: Use CloudWatch to monitor DynamoDB performance
2. **Optimize Queries**: Review and optimize query patterns
3. **Add Caching**: Consider adding application-level caching
4. **Backup Strategy**: Set up automated backups
5. **Remove JSON Files**: Once confident, you can remove the JSON files (keep backups)

## Support

For issues with the migration:

1. Check the application logs
2. Review AWS CloudWatch logs
3. Verify DynamoDB table structure in AWS Console
4. Test with the ConfigService health check