from langchain_core.tools import tool
import os

@tool
def generate_docker_config(project_type: str, port: int = 8080) -> str:
    """Generates a Dockerfile and docker-compose.yml content based on project type (e.g., node, python, go)."""
    if project_type.lower() == "node":
        dockerfile = f"""FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE {port}
CMD ["npm", "start"]"""
    elif project_type.lower() == "python":
        dockerfile = f"""FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE {port}
CMD ["python", "main.py"]"""
    else:
        dockerfile = f"# Optimized for {project_type}\n# Please refine the base image and commands\nFROM alpine\n..."

    docker_compose = f"""version: '3.8'
services:
  app:
    build: .
    ports:
      - "{port}:{port}"
    environment:
      - NODE_ENV=production
"""
    return f"Dockerfile:\n\n{dockerfile}\n\n---\n\ndocker-compose.yml:\n\n{docker_compose}"

@tool
def generate_cicd_pipeline(provider: str, environment: str = "production") -> str:
    """Generates CI/CD pipeline configuration for GitHub Actions or Jenkins."""
    if provider.lower() == "github":
        config = f"""name: CI/CD Pipeline
on:
  push:
    branches: [ main ]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and Push Docker Image
        run: |
          docker build -t my-app:${{ github.sha }} .
          # Add push commands here
"""
    elif provider.lower() == "jenkins":
        config = f"""pipeline {{
    agent any
    stages {{
        stage('Build') {{
            steps {{
                sh 'docker build -t my-app:${{env.BUILD_ID}} .'
            }}
        }}
        stage('Deploy') {{
            steps {{
                echo 'Deploying to {environment}...'
            }}
        }}
    }}
}}"""
    else:
        config = f"Unsupported provider: {provider}"
    
    return config

@tool
def generate_iac_config(tool_name: str, cloud_provider: str = "aws") -> str:
    """Generates Terraform or Ansible configurations for basic infrastructure."""
    if tool_name.lower() == "terraform":
        config = f"""provider "{cloud_provider}" {{
  region = "us-east-1"
}}

resource "{cloud_provider}_instance" "web" {{
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
  tags = {{
    Name = "MultiAgent-Web"
  }}
}}"""
    elif tool_name.lower() == "ansible":
        config = f"""- hosts: webservers
  become: yes
  tasks:
    - name: Ensure Docker is installed
      apt:
        name: docker.io
        state: present
"""
    else:
        config = f"Unsupported tool: {tool_name}"
        
    return config

@tool
def generate_monitoring_config() -> str:
    """Generates basic Prometheus and Grafana configuration snippets."""
    prometheus = """global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'multiagent_app'
    static_configs:
      - targets: ['localhost:8080']
"""
    grafana = """# Grafana Dashboard JSON snippet usually goes here
# Standard Node Exporter or App Metrics dashboard
"""
    return f"Prometheus Config:\n{prometheus}\n\nGrafana Snippet:\n{grafana}"
