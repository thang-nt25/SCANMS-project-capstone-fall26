const {build}=require('./report-uml-layout.cjs');
const args=process.argv.slice(2),classOnly=args.includes('--class-only'),sequenceOnly=args.includes('--sequence-only');
if(classOnly&&sequenceOnly)throw Error('Choose only one diagram kind');
const requested=args.filter(a=>!['--class-only','--sequence-only'].includes(a)).map(Number),features=requested.length?requested:[10,11,12,13,14,15,16];
for(const n of features){if(!Number.isInteger(n)||n<10||n>16)throw Error('Expected FR number 10 through 16');console.log(JSON.stringify(build(require('./fr'+n+'-report-spec.json'),__dirname,classOnly?['Class']:sequenceOnly?['Sequence']:['Class','Sequence'])));}
