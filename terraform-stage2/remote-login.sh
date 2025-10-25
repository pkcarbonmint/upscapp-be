#!/bin/bash

ssh -i ~/.ssh/upscAppAwsKey -o StrictHostKeyChecking=no -l ec2-user `terraform output -raw docker_instance_public_ip`

