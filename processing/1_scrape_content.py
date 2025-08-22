import requests
import json
import time
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

BASE_URL = "https://kurser.dtu.dk/course/"
COOKIES = {
    "ASP.NET_SessionId": "n52vuz1hozdfnzzspkunozvi",
    "{DTUCoursesPublicLanguage}": "en-GB",
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DTU-Course-Scraper/1.0)"
}

# Setup session with retries
session = requests.Session()
retries = Retry(
    total=5,
    backoff_factor=1,  # exponential backoff: 1s, 2s, 4s, ...
    status_forcelist=[500, 502, 503, 504]
)
session.mount("https://", HTTPAdapter(max_retries=retries))

# Load departments
with open("../jsons/department_names.json", "r") as file:
    departments = json.load(file)
departments_keys = list(departments.keys())

valid_courses = {}

for dep in departments_keys:
    print(f"🔍 Checking department: {dep}")
    for i in range(0, 1000):
        course_num = f"{dep}{i:03}"
        course_url = BASE_URL + course_num
        try:
            response = session.get(course_url, cookies=COOKIES, headers=HEADERS, timeout=10)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"⚠️ Skipping {course_num}: {e}")
            continue

        soup = BeautifulSoup(response.content, "html.parser")
        title_tag = soup.find("title")

        if not title_tag or "not found" in title_tag.text.lower():
            continue

        # Store HTML content
        valid_courses[course_num] = response.text
        print(f"✅ Found valid course: {course_num} ({title_tag.text.strip()})")

        # Be polite – avoid hammering the server
        time.sleep(0.2)

# Save results
with open("../jsons/valid_courses.json", "w") as file:
    json.dump(valid_courses, file, ensure_ascii=False, indent=2)

print(f"\n🎉 Done! Found {len(valid_courses)} valid courses.")
