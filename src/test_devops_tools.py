from tools.devops import generate_docker_config, generate_cicd_pipeline, generate_iac_config, generate_monitoring_config

def test_devops_tools():
    print("Testing Docker Config Generation...")
    docker_out = generate_docker_config.invoke({"project_type": "python", "port": 5000})
    print(docker_out)
    assert "FROM python:3.11-slim" in docker_out
    assert "EXPOSE 5000" in docker_out
    print("✅ Docker Test Passed\n")

    print("Testing CI/CD Pipeline Generation...")
    cicd_out = generate_cicd_pipeline.invoke({"provider": "jenkins", "environment": "staging"})
    print(cicd_out)
    assert "pipeline {" in cicd_out
    assert "staging" in cicd_out
    print("✅ CI/CD Test Passed\n")

    print("Testing IaC Config Generation...")
    iac_out = generate_iac_config.invoke({"tool_name": "terraform", "cloud_provider": "aws"})
    print(iac_out)
    assert 'provider "aws"' in iac_out
    print("✅ IaC Test Passed\n")

    print("Testing Monitoring Config Generation...")
    mon_out = generate_monitoring_config.invoke({})
    print(mon_out)
    assert "scrape_configs:" in mon_out
    print("✅ Monitoring Test Passed\n")

if __name__ == "__main__":
    try:
        test_devops_tools()
        print("ALL TESTS PASSED! 🚀")
    except Exception as e:
        print(f"❌ Test Failed: {e}")
