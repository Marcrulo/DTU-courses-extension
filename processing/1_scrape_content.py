import requests
import json
from bs4 import BeautifulSoup

base_url = "https://kurser.dtu.dk/course/"
cookies = {
    'ASP.NET_SessionId' : "n52vuz1hozdfnzzspkunozvi",
    '{DTUCoursesPublicLanguage}' : 'en-GB'
}

with open('department_names.json', 'r') as file:
    departments = json.load(file)
departments_keys = list(departments.keys())

valid_courses = {}
for dep in departments_keys:
    for i in range(0,1000):
        course_num = f"{dep}{i:03}"
        course_url = base_url + course_num
        response = requests.get(course_url, cookies=cookies)
        soup = BeautifulSoup(response.content, 'html.parser')
        title = soup.title.string
        if title is None:
            continue
        valid_courses[course_num] = response.text  

with open('valid_courses.json', 'w') as file:
    json.dump(valid_courses, file)


