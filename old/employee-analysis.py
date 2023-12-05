import csv

# step 1: load data
with open('employeeAttrition.csv') as f:
    data = [{k: v for k, v in row.items()}
        for row in csv.DictReader(f, skipinitialspace=True)]

# step 2: find probabilities of all RVs without conditioning
femaleCount, overtimeCount = 0, 0
for val in data:
    if val['Gender'] == 'Female':
        femaleCount += 1
    if val['OverTime'] == 'Yes':
        overtimeCount += 1

pFemale = femaleCount / len(data)   
pOvertime = overtimeCount / len(data)

print(pFemale, pOvertime)

# use rejection sampling / general inference to find conditionals w/ multiple RVs
incomeBuckets = []
