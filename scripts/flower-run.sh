#!/usr/bin/env bash

set -e

exec celery -A src.tasks.celery_tasks flower