FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 ENVIRONMENT=production
WORKDIR /app
COPY services/api/requirements.lock /app/requirements.lock
RUN pip install --no-cache-dir -r requirements.lock && useradd --create-home app
COPY services/api /app/services/api
COPY data /app/data
COPY ml/intent_pipeline.joblib /app/ml/intent_pipeline.joblib
USER app
WORKDIR /app/services/api
EXPOSE 8000
CMD ["sh","-c","exec uvicorn main:app --host 0.0.0.0 --port \"${PORT:-8000}\" --no-access-log"]
