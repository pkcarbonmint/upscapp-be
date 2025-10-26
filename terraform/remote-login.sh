#!/bin/bash

ssh -i ~/.ssh/upscAppAwsKey -o StrictHostKeyChecking=no -l ubuntu `terraform output -raw docker_instance_public_ip`

