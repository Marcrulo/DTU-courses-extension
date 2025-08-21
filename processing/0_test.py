import json 
import os

print(os.getcwd())
print(os.listdir('.'))

with open('valid_courses.json', 'r') as file:
    data = json.load(file)
    
print(data)