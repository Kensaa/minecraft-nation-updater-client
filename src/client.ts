import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {prompt,getHash,urlJoin,jsonFetch,folderTree} from './utils'

// Kinda cringe
// eslint-disable-next-line @typescript-eslint/no-empty-function
process.emitWarning = () => {}

const VERSION = '1.2.0'
const configFileName = 'config.json'

const configFileFolder = os.platform() === 'win32'
    ? os.homedir()+'\\Appdata\\Roaming\\MinecraftNationUpdater'
    : os.homedir()+'/.minecraftNationUpdater'

if(!fs.existsSync(configFileFolder)) fs.mkdirSync(configFileFolder,{recursive:true})

const configFileLocation = path.join(configFileFolder,configFileName)

const defaultConfig = {
    server: 'http://109.10.7.118:15006',
    minecraftLocation: os.platform() === 'win32'
        ? os.homedir() + '\\curseforge\\minecraft\\Instances\\All the Mods 7 - ATM7 - 1.18.2' 
        : 'unknown',
    lang:'fr'
}


const config = fs.existsSync(configFileLocation)
    ? JSON.parse(fs.readFileSync(configFileLocation, 'utf8'))
    : defaultConfig

if(!config.lang) {
    config.lang = 'fr'
}

const lang = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'langs', config.lang+'.json'), 'utf8'));

// eslint-disable-next-line no-unexpected-multiline
(async ()=>{
    console.log(lang.app_name)
    console.log()
    console.log(lang.start_message)
    
    if(!fs.existsSync(configFileLocation)){
        console.log()
        console.log(lang.first_start)

        const server = await prompt(lang.server_address_prompt.replace('%s',defaultConfig.server))
        if(server.trim() !== '') config.server = server

        console.log()

        const location = await prompt(lang.game_location_prompt.replace('%s',defaultConfig.minecraftLocation))
        if(location.trim() !== '') config.minecraftLocation = location
        
        fs.writeFileSync(configFileLocation, JSON.stringify(config, null, 4))
    }

    // Check if there is a new version available
    const newVersion = (await jsonFetch(urlJoin(config.server,'version')) as {version:string}).version
    if(newVersion !== VERSION){
        // New version available
        console.log()
        console.log(lang.new_software_version)
        process.exit(0)
    }
    console.log()
    await prompt(lang.start_update)


    const hashes = await jsonFetch(urlJoin(config.server,'hashes')) as {[k: string]: Record<string, unknown> | string}
    const blacklist = await jsonFetch(urlJoin(config.server,'blacklist')) as string[]

    const remotefiles = flatenFileTree(hashes)
    const localFiles = flatenFileTree(await folderTree(config.minecraftLocation) as {[k: string]: Record<string, unknown> | string})

    for(const file of localFiles){
        if(blacklist.find(e => file.path.includes(e)))continue
        const remote = remotefiles.find(e => e.path === file.path)
        if(remote){
            // File exist on server, check hash
            const localHash = await getHash(path.join(config.minecraftLocation,file.path))
            if(localHash !== remote.hash){
                // File has changed, update it
                await updateFile(file.path)
                console.log(lang.file_update + file.path)
            }
            
            // Remove file from remotefiles
            remotefiles.splice(remotefiles.findIndex(e => e.path === file.path),1)
        }else{
            if(!remote){
                // File dosnt exist on server, delete it
                fs.rmSync(path.join(config.minecraftLocation,file.path))
                console.log(lang.file_delete + file.path)
    
                // Check if deleted file was the last of the folder
                const folder = path.dirname(file.path)
                const files = fs.readdirSync(path.join(config.minecraftLocation,folder))
                if(files.length === 0){
                    // Delete folder
                    fs.rmdirSync(path.join(config.minecraftLocation,folder))
                    console.log(lang.folder_delete + folder)
                }
            }
        }
    }

    // Download file that are not on client
    for(const file of remotefiles){
        if(blacklist.find(e => file.path.includes(e)))continue
        console.log(lang.file_download + file.path)
        await updateFile(file.path)
    }
    console.log()
    console.log(lang.update_finished)
    await prompt(lang.press_enter)

})()


function flatenFileTree(tree:{[k: string]: Record<string, unknown> | string},filePath:string[]=[]): {path:string,hash:string}[]{
    const res = []
    const keys = Object.keys(tree)
    for(const key of keys){
        if(typeof tree[key] === 'string'){
            res.push({path:path.join(...filePath, key), hash:tree[key] as string})
        }
        else{
            res.push(...flatenFileTree(tree[key] as {[k: string]: Record<string, unknown> | string},[...filePath,key]))
        }
    }
    return res
}

async function updateFile(src:string){
    return new Promise<void>((resolve,reject)=>{
        // Bouleshite pour créer le dossier
        let dir = path.dirname(src)
        const dirs = []
        while(dir !== '.'){
            dirs.push(dir)
            dir = path.dirname(dir)
        }
        for(const dir of dirs.reverse()){
            if(!fs.existsSync(path.join(config.minecraftLocation,dir))) fs.mkdirSync(path.join(config.minecraftLocation,dir))
        }
    
        // On crée le fichier si il existe pas
        if(!fs.existsSync(src)) fs.writeFileSync(path.join(config.minecraftLocation,src),'')

        const file = fs.createWriteStream(path.join(config.minecraftLocation,src))
        http.get(urlJoin(config.server,'static',src),(res)=>{
            res.pipe(file)
            file.on('finish',()=>{
                file.close()
                resolve()
            })
        }).on('error',(err)=>reject(err))
    })
}

