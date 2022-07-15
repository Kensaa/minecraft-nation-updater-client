import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path'
import * as os from 'os'
import {prompt,getHash,urlJoin,jsonFetch,folderTree} from './utils'

//kinda cringe
process.emitWarning = ()=>{}

const VERSION = "1.0.0"
const configFileName = "config.json"

const configFileFolder = os.platform() === 'win32' ? os.homedir()+"\\Appdata\\Roaming\\MinecraftNationUpdater" : os.homedir()+"/.minecraftNationUpdater"

if(!fs.existsSync(configFileFolder)) fs.mkdirSync(configFileFolder,{recursive:true});
const configFileLocation = path.join(configFileFolder,configFileName)

//to change later
const defaultConfig = {
    server:"http://109.10.7.118:15006",
    minecraftLocation:os.platform() === 'win32' ? os.homedir() + "\\curseforge\\minecraft\\Instances\\All the Mods 7 - ATM7 - 1.18.2" : 'unknown'
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

    //Check if there is a new version available
    const newVersion = (await jsonFetch(urlJoin(config.server,'version')) as {version:string}).version;
    if(newVersion !== VERSION){
        //new version available
        console.log('\nUne nouvelle version est disponible, merci de mettre à jour ce programme en téléchargeant la nouvelle version ici : https://github.com/Kensaa/minecraft-nation-updater-client/releases')
        process.exit(0);
    }
    console.log()
    await prompt('Appuyez sur entrer pour commencer la mise à jour');


    const hashes = await jsonFetch(urlJoin(config.server,'hashes'))
    const blacklist = await jsonFetch(urlJoin(config.server,'blacklist')) as string[]

    const remotefiles = flatenFileTree(hashes);
    const localFiles = flatenFileTree(await folderTree(config.minecraftLocation) as {[k: string]: Object | string});

    for(const file of localFiles){
        if(blacklist.find(e => file.path.includes(e)))continue
        const remote = remotefiles.find(e => e.path === file.path)
        if(!remote){
            //file dosnt exist on server, delete it
            fs.rmSync(path.join(config.minecraftLocation,file.path))
            console.log("    Suppression du fichier : " + file.path)

            //check if deleted file was the last of the folder
            const folder = path.dirname(file.path)
            const files = fs.readdirSync(path.join(config.minecraftLocation,folder))
            if(files.length === 0){
                //delete folder
                fs.rmdirSync(path.join(config.minecraftLocation,folder))
                console.log("    Suppression du dossier : " + folder)
            }
        }else{
            //file exist on server, check hash
            const localHash = await getHash(path.join(config.minecraftLocation,file.path))
            if(localHash !== remote.hash){
                //file has changed, update it
                updateFile(file.path)
                console.log("    Mise à jour du fichier : " + file.path)
            }
            //remove file from remotefiles
            remotefiles.splice(remotefiles.findIndex(e => e.path === file.path),1)
        }
    }
    //download file that are not on client
    for(const file of remotefiles){
        if(blacklist.find(e => file.path.includes(e)))continue
        console.log("    Ajout du fichier : " + file.path)
        updateFile(file.path)
    }
    console.log("\nMise à jour terminée")
    await prompt('Appuyez sur entrer pour quitter');

})()


function flatenFileTree(tree:{[k: string]: Object | string},filePath:string[]=[]): {path:string,hash:string}[]{
    const res = []
    const keys = Object.keys(tree);
    for(let key of keys){
        if(typeof tree[key] === 'string'){
            res.push({path:path.join(...filePath, key), hash:tree[key] as string})
        }
        else{
            res.push(...flatenFileTree(tree[key] as {[k: string]: Object | string},[...filePath,key]));
        }
    }
    return res;
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

