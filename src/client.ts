import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path'
import * as os from 'os'
import { createInterface } from "readline";


const defaultConfig = {
    server:"http://localhost:3001/",
    minecraftLocation:os.platform() === 'win32' ? os.homedir() + "\\curseforge\\atm8" : 'unknown'
}



const config = fs.existsSync('config.json') ? JSON.parse(fs.readFileSync('config.json', 'utf8')) : defaultConfig;

function prompt(question: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

(async ()=>{
    console.log('Minecraft Nation Updater')
    console.log('This program will update your modpack to the latest version.')

})()