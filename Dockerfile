FROM python:3.10-slim-bullseye

RUN apt-get update && \
    apt-get install -y gcc libpq-dev && \
    apt update && \
    apt install -y libpango-1.0-0 libharfbuzz0b libpangoft2-1.0-0 libffi-dev libjpeg-dev libopenjp2-7-dev && \
    apt clean && \
    rm -rf /var/cache/apt/*

ENV PYTHONDONTWRITEBYTECODE=1 \ 
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8

COPY requirements/ /tmp/requirements

RUN pip install -U pip && \
    pip install --no-cache-dir -r /tmp/requirements/dev.txt

# Copy source code first for validation
COPY src/ /code/src/
COPY type_contracts/ /code/type_contracts/
COPY scripts/ci-compatibility-check.sh /code/scripts/ci-compatibility-check.sh

# Install validation dependencies
RUN pip install --no-cache-dir jsonschema requests pydantic

# Run comprehensive interface compatibility validation
# RUN chmod +x /code/scripts/ci-compatibility-check.sh && \
#     cd /code && \
#     REPORT_FILE=/tmp/python-compatibility-report.json ./scripts/ci-compatibility-check.sh && \
#     echo "✅ Python service interface compatibility validated" && \
#     cat /tmp/python-compatibility-report.json

COPY alembic/ /code/alembic/
COPY alembic.ini /code/alembic.ini
COPY scripts/ /code/scripts/
COPY logging.ini /code/logging.ini
COPY logging_production.ini /code/logging_production.ini
COPY pytest.ini /code/pytest.ini
    
ENV PATH "$PATH:/code/scripts"

RUN useradd -m -d /code -s /bin/bash app \
    && chown -R app:app /code/* && chmod +x /code/scripts/*

WORKDIR /code
USER app
# Skip migration during build - will run at startup when env vars are available
CMD ["./scripts/start-dev.sh"]