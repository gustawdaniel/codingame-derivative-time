import {run} from "./lib";

process.stdin.on('data', (buff) => {
    const input = buff.toString();
    process.stdout.write(run(input));
})
