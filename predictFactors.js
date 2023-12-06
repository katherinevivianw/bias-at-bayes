const fs = require('fs');
const readlineSync = require('readline-sync'); // for user input

const OLD_KEYS = ["Gender", "OverTime", "JobSatisfaction", "MonthlyIncome", "Attrition"];
const KEYS = ["Female", "OverTime", "JobSatisfaction", "MonthlyIncome", "Attrition"];
const DATASET_FILE = "backend/employee-data.csv";

function getMedianFactor(data, factor) {
    const factors = data.map(row => parseInt(row[factor]));
    return median(factors);
}

function deleteIrrelevantVariables(data) {
    return data.map(row => Object.fromEntries(OLD_KEYS.map(k => [k, row[k]])));
}

function convertDataToBoolean(data, medianIncome, medianSatisfaction) {
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
    const sortedArr = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sortedArr.length / 2);
    return sortedArr.length % 2 !== 0 ? sortedArr[mid] : (sortedArr[mid - 1] + sortedArr[mid]) / 2;
}

function load(filename) {
    const fileContent = fs.readFileSync(filename, 'utf-8');
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
}

function getPXGivenY(xColumn, yColumn, data) {
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

    return [(xOneYZero + 1) / (yZero + 2), (xOneYOne + 1) / (yOne + 2)];
}

function getAllPXGivenY(yColumn, data) {
    const allPXGivenY = {};

    for (const xVal in data[0]) {
        if (xVal !== yColumn) {
            allPXGivenY[xVal] = getPXGivenY(xVal, yColumn, data);
        }
    }

    return allPXGivenY;
}

function getPY(yColumn, data) {
    let yOne = 0;

    for (const entry of data) {
        if (entry[yColumn] === 1) {
            yOne++;
        }
    }

    return (yOne + 1) / (data.length + 2);
}

function jointProb(xRow, yColumn, allPXGivenY, pY) {
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
    return jointProb(xRow, y, allPXGivenY, pY);
}

function getUserXVals(xVal) {
    if (xVal === KEYS[0]) { // Female case
        return parseInt(readlineSync.question("Enter 1 or 0 for female. "));
    } else if (xVal === KEYS[1]) { // OverTime case
        return parseInt(readlineSync.question("Enter 1 or 0 for overtime. "));
    } else if (xVal === KEYS[2]) { // JobSatisfaction case
        return parseInt(readlineSync.question("Enter 1 or 0 for job satisfaction. "));
    } else if (xVal === KEYS[3]) { // MonthlyIncome case
        return parseInt(readlineSync.question("Enter 1 or 0 for monthly income. "));
    } else { // Attrition case
        return parseInt(readlineSync.question("Enter 1 or 0 for attrition. "));
    }
}

function getUserYVal() {
    return readlineSync.question("What do you want to predict? (Female, OverTime, JobSatisfaction, MonthlyIncome, Attrition) ");
}

function getUserInputs(yColumn) {
    const userRow = {};
    KEYS.filter(key => key !== yColumn).forEach(key => {
        userRow[key] = getUserXVals(key);
    });

    return userRow;
}

function predictAttrition(allPXGivenY, pY, data, yColumn) {
    const userRow = getUserInputs(yColumn);
    return getProbYGivenX(userRow, 1, allPXGivenY, pY);
}

function main() {
    // load the training set
    const training = load(DATASET_FILE);

    // compute model parameters (i.e. P(Y), P(X_i|Y))
    const yColumn = getUserYVal();
    const allPXGivenY = getAllPXGivenY(yColumn, training);
    console.log(`P(X_i | Y) = ${JSON.stringify(allPXGivenY)}`);
    const pY = getPY(yColumn, training);
    console.log(`P(Y) = ${pY}`);

    // get attrition prediction
    const pAttrition = predictAttrition(allPXGivenY, pY, training, yColumn);
    console.log(`P(Attrition) = ${pAttrition}`);
}

if (require.main === module) {
    main();
}