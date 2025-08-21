import json 

with open('valid_courses.json', 'r') as file:
    data = json.load(file)
    
print(data)