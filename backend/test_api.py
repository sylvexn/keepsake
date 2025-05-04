import requests
import argparse
import json
from datetime import datetime, timedelta

def test_health(server_url):
    """Test the health check endpoint"""
    url = f"{server_url}/health"
    try:
        response = requests.get(url)
        print(f"Health Check: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"Error testing health: {e}")
        return False

def test_stats(server_url):
    """Test the stats endpoint"""
    url = f"{server_url}/api/stats"
    try:
        response = requests.get(url)
        print(f"Stats: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"Error testing stats: {e}")
        return False

def test_images(server_url):
    """Test the images endpoint"""
    url = f"{server_url}/api/images"
    try:
        response = requests.get(url)
        print(f"Images: {response.status_code}")
        data = response.json()
        print(f"Total images: {data.get('total', 0)}")
        print(f"Page: {data.get('page', 0)} of {data.get('total_pages', 0)}")
        
        images = data.get('images', [])
        if images:
            print(f"First few images:")
            for img in images[:3]:
                print(f"- {img.get('id')}: {img.get('original_filename')} ({img.get('url')})")
        else:
            print("No images found")
            
        return response.status_code == 200
    except Exception as e:
        print(f"Error testing images: {e}")
        return False

def test_logs(server_url):
    """Test the logs endpoint"""
    url = f"{server_url}/api/logs"
    try:
        response = requests.get(url)
        print(f"Logs: {response.status_code}")
        data = response.json()
        print(f"Total logs: {data.get('total', 0)}")
        
        logs = data.get('logs', [])
        if logs:
            print(f"Recent logs:")
            for log in logs[:3]:
                print(f"- [{log.get('level')}] {log.get('message')}")
        else:
            print("No logs found")
            
        return response.status_code == 200
    except Exception as e:
        print(f"Error testing logs: {e}")
        return False

def test_errors(server_url):
    """Test the errors endpoint"""
    url = f"{server_url}/api/errors"
    try:
        response = requests.get(url)
        print(f"Errors: {response.status_code}")
        data = response.json()
        print(f"Total errors: {data.get('total', 0)}")
        
        errors = data.get('errors', [])
        if errors:
            print(f"Recent errors:")
            for error in errors[:3]:
                print(f"- [{error.get('severity')}] {error.get('message')}")
        else:
            print("No errors found")
            
        return response.status_code == 200
    except Exception as e:
        print(f"Error testing errors: {e}")
        return False

def test_filtered_images(server_url):
    """Test the filtered images endpoint"""
    # Get images from last week
    one_week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    
    url = f"{server_url}/api/images?date_from={one_week_ago}&sort_by=upload_timestamp&sort_order=DESC"
    try:
        response = requests.get(url)
        print(f"Filtered Images: {response.status_code}")
        data = response.json()
        print(f"Total images in last week: {data.get('total', 0)}")
            
        return response.status_code == 200
    except Exception as e:
        print(f"Error testing filtered images: {e}")
        return False

def run_all_tests(server_url):
    """Run all API tests"""
    print(f"Testing API endpoints at {server_url}")
    print("-" * 50)
    
    tests = [
        ("Health Check", test_health),
        ("Stats", test_stats),
        ("Images", test_images),
        ("Filtered Images", test_filtered_images),
        ("Logs", test_logs),
        ("Errors", test_errors)
    ]
    
    results = []
    
    for name, test_func in tests:
        print(f"\nTesting {name}...")
        success = test_func(server_url)
        results.append((name, success))
        print("-" * 50)
    
    # Print summary
    print("\nTest Summary:")
    all_passed = True
    for name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{name}: {status}")
        if not success:
            all_passed = False
    
    if all_passed:
        print("\nAll tests passed successfully!")
    else:
        print("\nSome tests failed. Check the output above for details.")

def main():
    parser = argparse.ArgumentParser(description='Test Keepsake API endpoints')
    parser.add_argument('--server', default='http://localhost:5005', help='Server URL')
    
    args = parser.parse_args()
    run_all_tests(args.server)

if __name__ == '__main__':
    main() 