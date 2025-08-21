import json 

with open('valid_courses.json', 'r') as file:
    data = json.loads(f)
    
print(data)