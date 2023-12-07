const OLD_KEYS = ["Gender", "OverTime", "JobSatisfaction", "MonthlyIncome", "Attrition"];
const KEYS = ["Female", "OverTime", "JobSatisfaction", "MonthlyIncome", "Attrition"];

function getMedianFactor(data, factor) {
    /**
     * Computes the median factor in the dataset.
     */
    const factors = data.map(row => parseInt(row[factor]));
    return median(factors);
}

function deleteIrrelevantVariables(data) {
    /**
     * Deletes variables we are not considering from the data dictionary.
     */
    return data.map(row => Object.fromEntries(OLD_KEYS.map(k => [k, row[k]])));
}

function convertDataToBoolean(data, medianIncome, medianSatisfaction) {
    /**
     * Converts all values in the data dictionary to be represented by boolean/Bernoulli values.
     */
    return data.map(row => {
        const newRow = {};

        for (const xVal in row) {
            if (xVal === OLD_KEYS[0]) { // Gender case
                newRow[KEYS[0]] = row[xVal] === "Female" ? 1 : 0;
            } else if (xVal === OLD_KEYS[1]) { // OverTime case
                newRow[KEYS[1]] = row[xVal] === "Yes" ? 1 : 0;
            } else if (xVal === OLD_KEYS[2]) { // JobSatisfaction case
                newRow[KEYS[2]] = parseInt(row[xVal]) >= medianSatisfaction ? 1 : 0;
            } else if (xVal === OLD_KEYS[3]) { // MonthlyIncome case
                newRow[KEYS[3]] = parseInt(row[xVal]) >= medianIncome ? 1 : 0;
            } else { // Attrition case
                newRow[KEYS[4]] = row[xVal] === "Yes" ? 1 : 0;
            }
        }

        return newRow;
    });
}

function median(arr) {
    /**
     * Computes the median given an array of numbers. 
     */
    const sortedArr = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sortedArr.length / 2);
    return sortedArr.length % 2 !== 0 ? sortedArr[mid] : (sortedArr[mid - 1] + sortedArr[mid]) / 2;
}

async function load(filename) {
    /**
     * Loads the input file into a list of dictionaries, where each dictionary in the list corresponds
     * to a row in the dataset. In each dictionary, the key corresponds to the column header name, and 
     * the value corresponds to the numerical boolean value. 
     */
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}: ${response.status} ${response.statusText}`);
        }

        const fileContent = await response.text();
        const csvRows = fileContent.split('\n');
        const headers = csvRows[0].split(',');
        const data = csvRows.slice(1).map(row => {
            const values = row.split(',');
            return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
        });

        // delete variables that we are not considering
        const newData = deleteIrrelevantVariables(data);

        // get median monthly income and satisfaction
        const medianSatisfaction = getMedianFactor(newData, KEYS[2]);
        const medianIncome = getMedianFactor(newData, KEYS[3]);

        // convert all values to integer boolean values
        const booleanData = convertDataToBoolean(newData, medianIncome, medianSatisfaction);

        return booleanData;
    } catch (error) {
        console.error(error);
    }
}

function getPXGivenY(xColumn, yColumn, data) {
    /**
     * Computes P(X = 1 | Y = 1) and P(X = 1 | Y = 0), where X is a single feature (column).
     * x_column: name of the column containing the feature X.
     * y_column: name of the class containing the class label.

     * return: [P(X = 1 | Y = 0), P(X = 1 | Y = 1)]
     */
    let xOneYOne = 0, xOneYZero = 0, yOne = 0, yZero = 0;

    for (const entry of data) {
        if (entry[xColumn] === 1 && entry[yColumn] === 1) {
            xOneYOne++;
        }
        if (entry[xColumn] === 1 && entry[yColumn] === 0) {
            xOneYZero++;
        }
        if (entry[yColumn] === 1) {
            yOne++;
        }
        if (entry[yColumn] === 0) {
            yZero++;
        }
    }

    return [(xOneYZero + 1) / (yZero + 2), (xOneYOne + 1) / (yOne + 2)];    // include laplace smoothing
}

function getAllPXGivenY(yColumn, data) {
    /**
     * Computes P(X | Y) for all possible X and Y values. Returns probabilities in the form
     * of a dictionary. The keys represent each possibly x value. The value of each key is a
     * list of length 2, corresponding to [P(x_i | Y=0), P(x_i | Y=1)].
     */
    const allPXGivenY = {};
    
    for (const xVal in data[0]) {
        if (xVal !== yColumn) {
            allPXGivenY[xVal] = getPXGivenY(xVal, yColumn, data);
        }
    }

    return allPXGivenY;
}

function getPY(yColumn, data) {
    /**
     * Computes P(Y = 1).
     */
    let yOne = 0;

    for (const entry of data) {
        if (entry[yColumn] === 1) {
            yOne++;
        }
    }

    return (yOne + 1) / (data.length + 2);
}

function jointProb(xRow, yColumn, allPXGivenY, pY) {
    /**
     * Computes the joint probability of a single row and y.
     */
    let probYGivenX = pY;

    for (const xVal in xRow) {
        if (xVal !== yColumn) {
            if (xRow[xVal] === 1) {
                probYGivenX *= allPXGivenY[xVal][yColumn];
            } else {
                probYGivenX *= 1 - allPXGivenY[xVal][yColumn];
            }
        }
    }

    return probYGivenX;
}

function getProbYGivenX(xRow, y, allPXGivenY, pY) {
    /**
     * Computes the probability of y given a single row under the 
     * Naive Bayes assumption.
     */
    return jointProb(xRow, y, allPXGivenY, pY);
}

function getUserYVal() {
    /**
     * Gets the Y Val from the selected radio button.
     */
    const selectedRadioButton = document.querySelector('input[name="answer"]:checked');
    return selectedRadioButton ? selectedRadioButton.value : null;
}

function getUserXVals(yColumn) {
    /**
     * Gets user inputs from the checkboxes and returns inputs as a dictionary.
     */
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    const userInputs = {};

    checkboxes.forEach((checkbox) => {
        userInputs[checkbox.name] = 1; // checked off checkboxes have a value of 1
    });

    KEYS.forEach(function(xVal) {
        if (!(xVal in userInputs)){
            userInputs[xVal] = 0;   // not checked off checkboxes have a value of 0
        }
    });
    delete userInputs[yColumn];     // delete y value we're predicting from the x value dict

    return userInputs;
}

function getUserRowOutput(userRow) {
    /**
     * Translates the userRow dict to a printable string in probability format.
     */
    let output = "";
    for (const [key, value] of Object.entries(userRow)) {
        output = output.concat(", " + key + "=" + value);
    }

    return output.slice(2);
}

function getUserRowWords(userRow) {
    /**
     * Translates the userRow dict to a printable string in word format.
     */
    let output = "";
    for (const [key, value] of Object.entries(userRow)) {
        output = output.concat(", ")
        output = output.concat(key + " is " + (value === 1 ? "true" : "false"));
    }

    return output.slice(2);
} 

function predictProbability(allPXGivenY, pY, data, yColumn) {
    /**
     * Calculates the final P(Y=1|X) and P(Y=0|X) probabilites and makes a prediction.
     * Sends probabilities and prediction to the frontend to be displayable for user. 
     */
    const userRow = getUserXVals(yColumn);
    const userRowOutput = getUserRowOutput(userRow);
    const userRowWords = getUserRowWords(userRow);

    // get P(Y=1|X) and P(Y=0|X) probabilities
    const pOne = getProbYGivenX(userRow, 1, allPXGivenY, pY);
    const pZero = getProbYGivenX(userRow, 0, allPXGivenY, pY);

    // sends probabilities to the frontned
    document.getElementById('probability-result-one').innerHTML = `Probability of ${yColumn} being true given <br> ${userRowWords}`;
    document.getElementById('probability-result-two').innerHTML = `= P(${yColumn}=1 | ${userRowOutput}) <br> = ${pOne}`;
    document.getElementById('probability-result-three').innerHTML = `Probability of ${yColumn} being false given <br> ${userRowWords}`;
    document.getElementById('probability-result-four').innerHTML = `= P(${yColumn}=0 | ${userRowOutput}) <br> = ${pZero}`;

    const yBool = (pOne > pZero ? "true" : false); // make final prediction based on which prob is greater
    document.getElementById('probability-result-five').innerHTML = `Final Prediction: ${yColumn} is ${yBool}`;  // send to frontend

    return p;
}

// Run Naive Bayes algorithm on the specified dataset.
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('submitButton').addEventListener('click', async function () {
        try {
            // get the filename based on the HTML
            const filename = document.location.pathname.includes('unbiased') ? 'employee-data-unbiased.csv' : 'employee-data-biased.csv';
            console.log(filename);

            // load the training set
            const training = await load(filename);

            // compute model parameters (i.e. P(Y), P(X_i|Y))
            const yColumn = getUserYVal();
            console.log(yColumn);
            if (yColumn === null) {
                throw("Need to input a Y value.");
            }
            const allPXGivenY = getAllPXGivenY(yColumn, training);
            console.log(`P(X_i | Y) = ${JSON.stringify(allPXGivenY)}`);
            const pY = getPY(yColumn, training);
            console.log(`P(Y) = ${pY}`);

            // get probability prediction
            const pPrediction = predictProbability(allPXGivenY, pY, training, yColumn);
            console.log(`P(Y Value) = ${pPrediction}`);
        } catch (error) {
            console.error(error);
        }
        
    });
});

// Hides the corresponding checkbox when the val is selected for a y val
document.addEventListener('DOMContentLoaded', function () {
    // add event listener to the radio buttons for immediate response
    const radioButtons = document.querySelectorAll('input[type="radio"][name="answer"]');
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const checkboxLabels = document.querySelectorAll('input[type="checkbox"] + label'); // Select labels associated with checkboxes

    radioButtons.forEach(radioButton => {
        radioButton.addEventListener('change', function () {
            const selectedValue = this.value;
            checkboxes.forEach((checkbox, index) => {
                if (checkbox.name === selectedValue) {
                    checkbox.style.visibility = 'hidden'; // make the checkbox invisible
                    checkboxLabels[index].style.visibility = 'hidden'; // make the label next to the checkbox invisible
                } else {
                    checkbox.style.visibility = 'visible'; // make other checkboxes visible
                    checkboxLabels[index].style.visibility = 'visible'; // make other labels next to checkboxes visible
                }
            });
        });
    });
});