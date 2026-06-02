#!/bin/bash
set -e

# Tier P1: Staging Certificate Authority & mTLS generation script
# DO NOT USE IN PRODUCTION. This is for the local physical soak environments.

mkdir -p certs
cd certs

echo "1. Generating Staging CA..."
openssl req -new -x509 -days 3650 -nodes -text -out ca.crt \
  -keyout ca.key -subj "/CN=ZTAN-Staging-CA"

echo "2. Generating PostgreSQL Server Certs..."
openssl req -new -nodes -text -out postgres.csr \
  -keyout postgres.key -subj "/CN=postgres"
openssl x509 -req -in postgres.csr -text -days 3650 \
  -extfile <(printf "subjectAltName=DNS:postgres,DNS:localhost,IP:127.0.0.1") \
  -CA ca.crt -CAkey ca.key -CAcreateserial -out postgres.crt

echo "3. Generating etcd Server Certs..."
openssl req -new -nodes -text -out etcd.csr \
  -keyout etcd.key -subj "/CN=etcd"
openssl x509 -req -in etcd.csr -text -days 3650 \
  -extfile <(printf "subjectAltName=DNS:etcd,DNS:localhost,IP:127.0.0.1") \
  -CA ca.crt -CAkey ca.key -CAcreateserial -out etcd.crt

echo "4. Generating Client mTLS Certs..."
openssl req -new -nodes -text -out client.csr \
  -keyout client.key -subj "/CN=ztan-client"
openssl x509 -req -in client.csr -text -days 3650 \
  -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt

# Set strict permissions required by Postgres
chmod 600 postgres.key client.key etcd.key ca.key

echo "✅ Staging mTLS certificates generated successfully in ./certs"
