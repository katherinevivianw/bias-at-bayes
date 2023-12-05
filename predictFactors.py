import csv
import numpy as np

OLD_DICT_KEYS = ["Gender", "OverTime", "JobSatisfaction", "MonthlyIncome", "Attrition"]
KEYS = ["Female", "OverTime", "JobSatisfaction", "MonthlyIncome", "Attrition"]

def get_median_income(data):
    """
    Computes the median monthly income in the dataset.
    """
    incomes = []
    for row in data:
        incomes.append(int(row["MonthlyIncome"]))

    return np.median(incomes)

def get_median_satisfaction(data):
    """
    Computes the median job satisfaction rating in the dataset.
    """
    satisfactions = []
    for row in data:
        satisfactions.append(int(row["JobSatisfaction"]))
    
    return np.median(satisfactions)

def delete_irrelevant_variables(data):
    """
    Deletes variables we are not considering from the data dictionary.
    """
    for i in range(len(data)):
        row = data[i]
        data[i] = {k: row[k] for k in OLD_DICT_KEYS}
    
    return data

def convert_data_to_boolean(data, median_income, median_satisfaction):
    """
    Converts all values in the data dictionary to be represented by boolean/Bernoulli values.
    """
    print(median_income, median_satisfaction)
    booleanData = []
    for row in data:
        newRow = {}

        for x_val in row:
            match x_val:
                case "Gender":
                    newRow["Female"] = 1 if row[x_val] == "Female" else 0
                case "OverTime":
                    newRow["OverTime"] = 1 if row[x_val] == "Yes" else 0
                case "JobSatisfaction":
                    newRow["JobSatisfaction"] = 1 if int(row[x_val]) >= median_satisfaction else 0
                case "MonthlyIncome":
                    newRow["MonthlyIncome"] = 1 if int(row[x_val]) >= median_income else 0
                case "Attrition":
                    newRow["Attrition"] = 1 if row[x_val] == "Yes" else 0
        
        booleanData.append(newRow)
    
    return booleanData

def load(filename):
    """
    Loads the input file into a list of dictionaries, where each dictionary in the list corresponds
    to a row in the dataset. In each dictionary, the key corresponds to the column header name, and 
    the value corresponds to the numerical boolean value. 
    """
    with open(filename, 'r') as file:
        csv_reader = csv.DictReader(file)
        data = [row for row in csv_reader]

    # delete variables that we are not considering
    data = delete_irrelevant_variables(data)
    print(data[5])
    
    # get median monthly income and satisfaction
    median_income = get_median_income(data)
    median_satisfaction = get_median_satisfaction(data)  

    # convert all values to integer boolean values
    boolean_data = convert_data_to_boolean(data, median_income, median_satisfaction)
    print(boolean_data[5])
        
    return boolean_data

def get_p_x_given_y(x_column, y_column, data):
    """
    Computes P(X = 1 | Y = 1) and P(X = 1 | Y = 0), where X is a single feature (column).
    x_column: name of the column containing the feature X.
    y_column: name of the class containing the class label.

    return: [P(X = 1 | Y = 0), P(X = 1 | Y = 1)]
    """
    x_one_y_one, x_one_y_zero, y_one, y_zero = 0, 0, 0, 0

    for entry in data:
        if entry[x_column] == 1 and entry[y_column] == 1:
            x_one_y_one += 1
        if entry[x_column] == 1 and entry[y_column] == 0:
            x_one_y_zero += 1
        if entry[y_column] == 1:
            y_one += 1
        if entry[y_column] == 0:
            y_zero += 1
    
    return [(x_one_y_zero + 1) / (y_zero + 2), (x_one_y_one + 1) /(y_one + 2)]      # include laplace smoothing

def get_all_p_x_given_y(y_column, data):
    """
    Computes P(X | Y) for all possible X and Y values. Returns probabilities in the form
    of a dictionary. The keys represent each possibly x value. The value of each key is a
    list of length 2, corresponding to [P(x_i | Y=0), P(x_i | Y=1)].
    """
    all_p_x_given_y = {}

    for x_val in data[0].keys():
        if x_val != y_column:
            all_p_x_given_y[x_val] = get_p_x_given_y(x_val, y_column, data)

    return all_p_x_given_y

def get_p_y(y_column, data):
    """
    Computes P(Y = 1).
    """
    yOne = 0
    for entry in data:
        if entry[y_column] == 1:
            yOne += 1
    
    return (yOne + 1) / (len(data) + 2)     # include laplace smoothing
    
def joint_prob(x_row, y_column, all_p_x_given_y, p_y):
    """
    Computes the joint probability of a single row and y.
    """
    prob_y_given_x = p_y
    for x_val in x_row.keys():
        if x_val != y_column:
            if x_row[x_val] == 1:      # curr x_val is 1 in the given x vector
                prob_y_given_x *= all_p_x_given_y[x_val][y_column]
            else:
                prob_y_given_x *= 1 - all_p_x_given_y[x_val][y_column]
    
    return prob_y_given_x

def get_prob_y_given_x(x_row, y, all_p_x_given_y, p_y):
    """
    Computes the probability of y given a single row under the 
    Naive Bayes assumption.
    """
    return joint_prob(x_row, y, all_p_x_given_y, p_y)

def get_user_x_vals(x_val):
    if x_val == "Female":
        return int(input("Enter 1 or 0 for female. "))
    elif x_val == "OverTime":
        return int(input("Enter 1 or 0 for overtime. "))
    elif x_val == "JobSatisfaction":
        return int(input("Enter 1 or 0 for job satisfaction. "))
    elif x_val == "MonthlyIncome":
        return int(input("Enter 1 or 0 for monthly income. "))
    else:
        return int(input("Enter 1 or 0 for attrition. "))

def get_user_y_val():
    return input("What do you want to predict? (Female, OverTime, JobSatisfaction, MonthlyIncome, Attrition) ")

def get_user_inputs(y_column):
    """
    Prompts user for x input values and returns a dictionary of the 
    user inputs.
    """
    user_row = dict.fromkeys(KEYS, -1)
    del user_row[y_column]

    for key in user_row:
        user_row[key] = get_user_x_vals(key)

    return user_row

def predict_attrition(all_p_x_given_y, p_y, data, y_column):
    """
    Predicts the probability of attrition given the user's input x vlaues.
    """
    # get user inputs for x values 
    user_row = get_user_inputs(y_column)

    # find and return P(x|y=1)P(y=1)
    return get_prob_y_given_x(user_row, 1, all_p_x_given_y, p_y)       
        
def main():
    # load the training set
    training = load("employee-data.csv")

    # compute model parameters (i.e. P(Y), P(X_i|Y))
    y_column = get_user_y_val()
    all_p_x_given_y = get_all_p_x_given_y(y_column, training)
    #print(f"P(X_i | Y) =  {all_p_x_given_y}")
    p_y = get_p_y(y_column, training)
    #print(f"P(Y) =  {p_y}")

    # get attrition prediction
    print(f"P(Attrition) =  {predict_attrition(all_p_x_given_y, p_y, training, y_column)}")
    
if __name__ == "__main__":
    main()