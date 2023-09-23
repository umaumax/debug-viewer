FROM python:3.11.5-alpine3.18

RUN apk update
RUN apk add build-base

WORKDIR /app/

ADD requirements.txt /app/
RUN pip install -r requirements.txt
ADD . /app/

EXPOSE 8765

CMD ["python", "./server.py"]
