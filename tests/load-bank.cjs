const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
module.exports=function(){const ctx=vm.createContext({});for(const name of ['questions','learning','content'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),ctx);return JSON.parse(vm.runInContext('JSON.stringify(BANK)',ctx));};
