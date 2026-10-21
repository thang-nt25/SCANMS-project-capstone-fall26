const {build}=require('./report-uml-layout.cjs');
console.log(JSON.stringify(build(require('./fr12-report-spec.json'))));
