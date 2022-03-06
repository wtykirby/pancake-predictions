import fs from 'fs';
import { stringify } from 'csv-stringify/sync';

const INPUT_FILE = './results.json';
const OUTPUT_FILE = './output.csv';

main();

async function main() {
    const start = Date.now()

    const input = await fs.promises.readFile(INPUT_FILE);
    const data = JSON.parse(input);

    const output = [];
    for (let i = 0; i < data.length; i++) {
        if (!data[i]) {
            console.log(data[i]);
        } else {

            output.push(format(data, i));
        }
    }

    await fs.promises.writeFile(OUTPUT_FILE, stringify(output));

    const stop = Date.now()
    console.debug(`Done. Took ${(stop - start) / 1000} seconds`)
}

function format(data, index) {
    const record = data[index];
    if (!record) {
        return;
    }

    const formatted = [];

    formatted.push(record.epoch);
    formatted.push(record.startTimestamp);
    formatted.push(record.lockTimestamp);
    formatted.push(record.closeTimestamp);

    formatted.push(getLockPrice(record));
    formatted.push(getClosePrice(record));

    formatted.push(WeiToBNB(record.totalAmount));
    formatted.push(WeiToBNB(record.bullAmount));
    formatted.push(WeiToBNB(record.bearAmount));

    // Add price data from last round
    formatted.push(getLockPrice(getBackData(data, index, 1)));
    formatted.push(getClosePrice(getBackData(data, index, 1)));

    // Add price data from two rounds back
    formatted.push(getLockPrice(getBackData(data, index, 2)));
    formatted.push(getClosePrice(getBackData(data, index, 2)));

    // Add price data from five rounds back
    formatted.push(getLockPrice(getBackData(data, index, 5)));
    formatted.push(getClosePrice(getBackData(data, index, 5)));

    // Add price data from ten rounds back
    formatted.push(getLockPrice(getBackData(data, index, 10)));
    formatted.push(getClosePrice(getBackData(data, index, 10)));

    return formatted;
}

function getBackData(data, i, j) {
    return i - j < 0 ? null : data[i - j];
}

function getLockPrice(record) {
    if (!record) {
        return null;
    }

    return priceAsDecimal(record.lockPrice);
}

function getClosePrice(record) {
    if (!record) {
        return null;
    }

    return priceAsDecimal(record.closePrice);
}

const PRICE_TO_DECIMAL_FACTOR = 10**8;
function priceAsDecimal(price) {
    return parseInt(price) / PRICE_TO_DECIMAL_FACTOR;
}

const WEI_TO_BNB_FACTOR = 10**18;
function WeiToBNB(uint256) {
    return parseInt(uint256) / WEI_TO_BNB_FACTOR;
}