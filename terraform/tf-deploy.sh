#!/bin/bash

set -e
set -a; source ../.env.local; set +a;

# Check that TF_TF_VAR_github_token and TF_VAR_github_repository_url
# are set
if [ -z "$TF_VAR_github_token" ] || [ -z "$TF_VAR_github_repository_url" ]; then
    echo "Error: TF_VAR_github_token and TF_VAR_github_repository_url must be set"
    exit 1
fi

terraform plan
terraform apply -auto-approve
