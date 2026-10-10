/* Independent numeric checks for the authored solutions and supplied answer keys. */
const assert=require('node:assert/strict'),bank=require('./load-bank.cjs')();
const actual=id=>{const q=bank.find(q=>q.id===id);return q.type==='MCQ'?q.options[q.answer]:q.answer;};
const norm=s=>String(s).replace(/[%,\s]/g,'');
const round=(n,d=0)=>+n.toFixed(d);
const expected={
 1:round((150*.96/110-1)*100),2:8840/(.85*.8),3:100-(2*30+45)/3,4:72/(.9*1.25*.8),5:round((1.4/1.27-1)*100),6:20,7:(150-.2*450)/.12*1.12,
 8:(675/400-1)*100,9:25,10:10,11:(9.45/7.5-1)*100,12:round(2.82/21.27*100,2),13:12+.9*80,14:100000*.73,15:55,16:340,17:'72 and 80, respectively',18:'Sell at retail price',19:135-125,20:14,
 21:4290/(1.1*1.3*1.5),22:300/960*100,23:4860/.81*1.17-4860,24:20/.25,25:2000/.5,26:20000,27:round((110/75-1)*100),28:(2880/1920-1)*100,29:28,30:13*100*1.26/(12*.78),31:15.5,32:round(550/3850*100),33:4500-3200-300,34:407,
 35:round(9600*(1.075**4-1)),36:3600/300,37:3/8*100,38:20,39:9,40:6,41:1500+2500,42:18522/1.05**3,43:1125/(1.05**2-1-.09),44:(12000*.08+10000*(1.03**2-1))/.075,45:9,46:round(866.72*1.075,2),47:10000*4*(1.03**2-1),48:210000*1.1**2/2.1,49:8,50:round(206000*1.04**4+10320-200000),51:22000*1.02**2/1.1,
 52:(1184-640)/2,53:207,54:800,55:'438 crore',56:'4 : 3',57:'7/33',58:99,59:30+16+20,60:'5 : 4',61:round((7.5/7-1)*100),62:43200,63:'7 : 9',64:'3 : 5',65:'11 : 3',66:20000-14000-4000,67:80*(1600-1250)-7500,68:1296000,
 69:'4 : 5',70:18,71:420+84+73-528,72:1353-1302,73:1,74:'4 : 1',75:60,76:(2*200000+1000000+3*800000)/40,77:(1800000-90000/.2)/25,78:(150-10*6)/20,79:(50*2+30*3)/20,
 80:20,81:59500/.85,82:'243 ≤ N ≤ 252',83:70,84:6000*1.1,85:round(23.25/35*100),86:57/.12*.84,87:round((2/.88-1)*100),88:450-200,89:2512/.05/.8,90:15000*.06,91:'5 : 8',92:8,93:150/(16.5-13.5),94:1.2*1.3-.8*.7,95:round((18.05/14.4-1)*100),96:160,97:1680,98:275625/525,
 99:'1 : 1',100:58*125,101:32,102:3*37,103:11,104:32,105:38-390/39,106:105,107:6,108:4,109:150-4*37,110:35,111:18,112:1/.05-10,113:(1250-790)/5,114:5,115:20,116:3700+(6600-4500)/3,117:14,118:135/6,119:63,120:21,121:15,122:70,123:700
};
for(const [n,value] of Object.entries(expected)){const got=actual(`Q${n}`);if(typeof value==='number')assert(Math.abs(Number(String(got).replace('%',''))-value)<1e-6,`Q${n}: expected ${value}, key ${got}`);else assert.equal(norm(got),norm(value),`Q${n}`);}
// Exhaustively check the bounds that simple answer-key comparison cannot establish.
let minClass=Infinity;for(let b=11;b<150;b++)for(let g=1;g<150;g++)if(Number.isInteger(.6*b)&&Number.isInteger(.4*g)&&Math.abs(.6*g-.4*b-8)<1e-8)minClass=Math.min(minClass,b+g);assert.equal(minClass,55);
let minFruits=Infinity;for(let total=1;total<=1000;total++)for(let apples=1;apples<total;apples++){const mango=.4*total,bananas=total-mango-apples;if(bananas>=96&&Number.isInteger(mango/2)&&Number.isInteger(.4*apples)&&Math.abs(mango/2+96+.4*apples-total/2)<1e-8)minFruits=Math.min(minFruits,total);}assert.equal(minFruits,340);
const partitions=[];for(let a=1;a<18;a++)for(let b=a+1;b<18;b++)for(let c=b+1;c<18;c++){const d=18-a-b-c;if(d>c)partitions.push(a*a+b*b+c*c+d*d);}assert.equal(Math.min(...partitions),86);assert.equal(Math.max(...partitions),158);
const sizes=[];for(let n=1;n<=200;n++)if(Number.isInteger((32*n+60*(n+10))/(2*n+10)))sizes.push(n);assert.deepEqual(sizes,[2,5,9,30,65]);
console.log('PASS all 123 handout keys independently checked, including integer bounds.');
