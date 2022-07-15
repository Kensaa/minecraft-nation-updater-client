import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path'
import * as os from 'os'
import {prompt,getHash,urlJoin} from './utils'

//kinda cringe
process.emitWarning = ()=>{}

const configFileName = "config.json"

const configFileFolder = os.platform() === 'win32' ? os.homedir()+"\\Appdata\\Roaming\\MinecraftNationUpdater" : os.homedir()+"/.minecraftNationUpdater"

if(!fs.existsSync(configFileFolder)) fs.mkdirSync(configFileFolder,{recursive:true});
const configFileLocation = path.join(configFileFolder,configFileName)

//to change later
const defaultConfig = {
    //server:"http://109.10.7.118:15006/",
    server:"http://localhost:3001/",
    minecraftLocation:os.platform() === 'win32' ? os.homedir() + "\\curseforge\\atm8" : 'unknown'
}

const config = fs.existsSync(configFileLocation) ? JSON.parse(fs.readFileSync(configFileLocation, 'utf8')) : defaultConfig;

(async ()=>{
    console.log('Minecraft Nation Updater')
    console.log("\nCe programme mettra à jour votre version du modpack afin d'appliquer les dernières modifications.")
    console.log("\nEn cas d'erreur vous pouvez contacter Kensa#4948 sur discord ou créer une issue sur le github du projet : ")
    console.log("https://github.com/Kensaa/minecraft-nation-updater-client")
    if(!fs.existsSync(configFileLocation)){
        console.log("\nIl semblerait que c\'est votre première utilisation de ce programme. Veuillez repondre aux questions suivantes.\nLaissez les champs vides pour les valeurs par défaut.\n")
        const server = await prompt("    Quelle est l'adresse du serveur de mise a jour ? (par defaut : " + defaultConfig.server + ") : ");
        if(server.trim() !== '')config.server = server;
        console.log()
        const location = await prompt("    Quelle est le dossier d'installation de votre modpack ?\n    (Vous pouvez la voire depuis Curseforge en faisant \"ouvrir le dossier\")\n    (par defaut : " + defaultConfig.minecraftLocation + ") : ");
        if(location.trim() !== '')config.minecraftLocation = location;

        fs.writeFileSync(configFileLocation, JSON.stringify(config, null, 4));
    }
    console.log()
    await prompt('Appuyez sur entrer pour commencer la mise à jour');


    const hashes = await (await fetch(urlJoin(config.server,'hashes'))).json();
    const remotefiles = discoverHashTree(hashes);

    const localFiles = discoverHashTree(await folderHash(config.minecraftLocation) as {[k: string]: Object | string});

    for(let remoteFile of remotefiles){
        const localFile = localFiles.find(x=>x.path === remoteFile.path)
        if(!localFile){
            console.log(`    Nouveau fichier : ${remoteFile.path}`)
            await updateFile(remoteFile.path)
        }else{
            if(localFile.hash !== remoteFile.hash){
                console.log(`    Fichier modifié : ${remoteFile.path}`)
                await updateFile(remoteFile.path)
            }
        }
    }
    await prompt('Appuyez sur entrer pour quitter');

})()


function discoverHashTree(tree:{[k: string]: Object | string},filePath:string[]=[]): {path:string,hash:string}[]{
    const res = []
    const keys = Object.keys(tree);
    for(let key of keys){
        if(typeof tree[key] === 'string'){
            res.push({path:path.join(...filePath, key), hash:tree[key] as string})
        }
        else{
            res.push(...discoverHashTree(tree[key] as {[k: string]: Object | string},[...filePath,key]));
        }
    }
    return res;
}

async function folderHash(src: string): Promise<Object | string> {
    if (fs.statSync(src).isFile()) {
        return await getHash(src)
    } else {
        const res: {[k: string]: Object | string} = {}
        const files = fs.readdirSync(src)
        for (const file of files) {
            const filePath = path.join(src, file)
            const fileInfo = await folderHash(filePath)
            res[file] = fileInfo
        }
        return res
    }
}

async function updateFile(src:string){
    return new Promise<void>((resolve,reject)=>{
        //bouleshite pour créer le dossier
        var dir = path.dirname(src)
        const dirs = []
        while(dir != '.'){
            dirs.push(dir)
            dir = path.dirname(dir)
        }
        for(let dir of dirs.reverse()){
            if(!fs.existsSync(path.join(config.minecraftLocation,dir))) fs.mkdirSync(path.join(config.minecraftLocation,dir))
        }
    
        //on crée le fichier si il existe pas
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

