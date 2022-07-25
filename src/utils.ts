import {createHash} from 'crypto'
import {createReadStream} from 'fs'
import { createInterface } from 'readline'
import * as fs from 'fs'
import * as path from 'path'


export function prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout
        })
        rl.question(question, (answer) => {
            rl.close()
            resolve(answer)
        })
    })
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
    return encodeURI(args.map(e=>e.replace(/\\/g,'/')).join('/').replace(/\/+/g,'/'))
}

export async function jsonFetch(url: string): Promise<unknown> {
    return (await fetch(url)).json()
}

export async function folderTree(src: string): Promise<Record<string, unknown> | string> {
    if (fs.statSync(src).isFile()) {
        return ''
    } else {
        const res: {[k: string]: Record<string, unknown> | string} = {}
        const files = fs.readdirSync(src)
        for (const file of files) {
            const filePath = path.join(src, file)
            const fileInfo = await folderTree(filePath)
            res[file] = fileInfo
        }
        return res
    }
}

export async function hashTree(src: string): Promise<Record<string, unknown> | string> {
    if (fs.statSync(src).isFile()) {
        return await getHash(src)
    } else {
        const res: {[k: string]: Record<string, unknown> | string} = {}
        const files = fs.readdirSync(src)
        for (const file of files) {
            const filePath = path.join(src, file)
            const fileInfo = await hashTree(filePath)
            res[file] = fileInfo
        }
        return res
    }
}