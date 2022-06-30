import {createHash} from 'crypto'
import {createReadStream} from 'fs'
import { createInterface } from "readline";

export function prompt(question: string): Promise<string> {
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
export function getHash(src:string):Promise<string>{
    return new Promise<string>((resolve,reject)=>{
        const stream = createReadStream(src)
        const hash = createHash('md5')
        stream.on('end',()=>resolve(hash.digest('hex')))
        stream.on('error',(err)=>reject(err))
        stream.pipe(hash)
    })
    
}

export function urlJoin(...args: string[]) {
    return encodeURI(args.map(e=>e.replace(/\\/g,'/')).join('/').replace(/\/+/g,'/'));
}