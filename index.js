import Web3 from "web3";
import fs from 'fs';
import _ from 'lodash';

// How many previous rounds to fetch
const ROUNDS_TO_FETCH = 100;
// How many rounds to fetch in a single chunk
const CHUNK_SIZE = 50;
// How long to wait between chunks
const SLEEP_TIME = 1000;
// The file to write the results to 
const OUTPUT_FILE = './results.json';

// Connect to one of BSC's public RPC nodes
const url = 'https://bsc-dataseed1.binance.org/';
const web3 = new Web3(new Web3.providers.HttpProvider(url));

// Run the code
main();

async function main() {
    const start = Date.now()

    // Fetch the round data for the requested number of records
    console.debug(`Fetching historical data for last ${ROUNDS_TO_FETCH} rounds`)
    const rounds = await getHistoricalRounds(ROUNDS_TO_FETCH);
    console.debug(`Successfully fetched data for ${rounds.length} rounds`)

    // Write the result to a file
    console.debug(`Writing result to '${OUTPUT_FILE}'`)
    await fs.promises.writeFile(OUTPUT_FILE, JSON.stringify(rounds, null, 4));
    console.debug(`Successfully wrote ${rounds.length} records to '${OUTPUT_FILE}'`)

    const stop = Date.now()
    console.debug(`Done. Took ${(stop - start) / 1000} seconds`)
}

async function getContractInstance() {
    const address = '0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA';
    const PancakePredictionV2 = await getPancakePredictionV2ContractABI();
    return new web3.eth.Contract(PancakePredictionV2, address);
}

async function getPancakePredictionV2ContractABI() {
    const contents = await fs.promises.readFile('./PancakePredictionV2.json');
    return JSON.parse(contents);
}

async function getHistoricalRounds(count) {
    // Create an instance of the PancakePredictionV2 contract using the ABI
    const instance = await getContractInstance();

    // Get the current round index from the contract
    const currentEpoch = await instance.methods.currentEpoch().call();

    // Calculate the starting rounds based on the current round and the requested number to fetch
    const start = currentEpoch - 1 - count;

    // Build the list of requests for fetching all of the rounds. This helps to speed up the data fetching
    const requests = [];
    for (let epoch = start; epoch < currentEpoch - 1; epoch++) {
        requests.push(instance.methods.rounds(epoch));
    }

    // Fetch all of the rounds in chunks
    let rounds = [];
    for (const chunk of _.chunk(requests, CHUNK_SIZE)) {
        const promises = chunk.map(el => {
            return el.call().catch(() => {});
        });
        const fetched = await Promise.all(promises);
        rounds = [...rounds, ...fetched];
        await sleep(SLEEP_TIME);
    }

    // Return a formatted copy of the data
    return rounds.map(round => getFormattedRound(round));
}

function getFormattedRound(round) {
    if (!round) {
        return;
    }

    const result = round.lockPrice < round.closePrice ? 0 : 1; // "0" is UP and "1" is DOWN

    return {
        epoch: round.epoch,
        startTimestamp: round.startTimestamp,
        lockTimestamp: round.lockTimestamp,
        closeTimestamp: round.closeTimestamp,
        lockPrice: round.lockPrice,
        closePrice: round.closePrice,
        totalAmount: round.totalAmount,
        bullAmount: round.bullAmount,
        bearAmount: round.bearAmount,
        result
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
