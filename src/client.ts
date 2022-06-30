import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path'
import * as os from 'os'
import { createInterface } from "readline";


const defaultConfig = {
    server:"http://localhost:3001/",
    minecraftLocation:os.platform() === 'win32' ? os.homedir() + "\\curseforge\\atm8" : 'unknown'
}



const config = fs.existsSync('config.json') ? JSON.parse(fs.readFileSync('config.json', 'utf8')) : {};


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
    console.log("\nCe programme mettra à jour votre version du modpack afin d'appliquer les dernières modifications au modpack.")
    if(!fs.existsSync('config.json')){
        console.log("\nIl semblerait que c\'est votre première utilisation de ce programme. Veuillez repondre aux questions suivantes.\nLaissez les champs vides pour les valeurs par défaut.\n")
        const address = await prompt("    Quelle est l'adresse du serveur de mise a jour ? (par defaut : " + defaultConfig.server + ") : ");
        if(address.trim() !== '')config.address = address;
        console.log()
        const location = await prompt("    Quelle est le dossier d'installation de votre modpack ?\n    (Vous pouvez la voir depuis Curseforge en faisant \"ouvrir le dossier\")\n    (par defaut : " + defaultConfig.minecraftLocation + ") : ");
        if(location.trim() !== '')config.minecraftLocation = location;

        fs.writeFileSync('config.json', JSON.stringify(config, null, 4));

    }
    console.log()
    await prompt('Appuyez sur entrer pour commencer la mise à jour');


    const hashes = await (await fetch(config.server + 'hashes')).json();
    fs.writeFileSync('hashes.json',JSON.stringify(hashes,null,4));
    
    fs.writeFileSync('test.json',JSON.stringify(discoverHashTree(hashes),null,4));
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


})()

async function updateFile(src:string){

}
