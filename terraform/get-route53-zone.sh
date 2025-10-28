#!/bin/bash

# Script to query AWS for Route53 hosted zone information

echo "Checking for Route53 hosted zones..."
echo ""

# Try to find hosted zones
echo "=== All Hosted Zones ==="
aws route53 list-hosted-zones --query "HostedZones[].[Name, Id, ResourceRecordSetCount]" --output table

echo ""
echo "=== Looking for upscpro.laex.in ==="
aws route53 list-hosted-zones-by-name --dns-name "upscpro.laex.in"

echo ""
echo "=== Alternative: Check with domain registrars ==="
echo "If the domain is managed externally, you need to:"
echo "1. Get the hosted zone ID from the provider managing upscpro.laex.in"
echo "2. Or use Route53 in a different AWS account that has access to the domain"
echo ""
echo "=== To set up Route53 if it doesn't exist ==="
echo "1. Go to AWS Console > Route53 > Hosted Zones"
echo "2. Create hosted zone for 'upscpro.laex.in'"
echo "3. Update your domain's nameservers to the AWS nameservers provided"
echo "4. Get the hosted zone ID (format: Z1234567890ABC)"
echo "5. Set it in terraform/terraform.tfvars as route53_zone_id"

