#!/usr/bin/env bash

set -e

exec celery -A src.tasks.celery_tasks  worker -l INFO -E