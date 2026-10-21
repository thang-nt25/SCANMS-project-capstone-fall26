// Keep FR03 on the same native UML renderer and FR9 layout as FR01/FR02.
const {build}=require('./report-uml-layout.cjs');
console.log(JSON.stringify(build(require('./fr03-report-spec.json'))));
